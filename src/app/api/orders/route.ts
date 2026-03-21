import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/orders - 주문 목록 조회 (전광판 + 검색)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const sellerId = params.get('seller_id')
  const buyerId = params.get('buyer_id')
  const dateFrom = params.get('dateFrom') || params.get('date_from')
  const dateTo = params.get('dateTo') || params.get('date_to')
  const status = params.get('status')
  const readyMade = params.get('ready_made')
  const mode = params.get('mode') // 'display_board' | 'search'

  try {
    if (sellerId) {
      // 판매회사 조회: seller_id 기준
      let query = supabase
        .from('orders_m')
        .select('*')
        .eq('seller_id', sellerId)

      if (dateFrom) query = query.gte('order_date', dateFrom)
      if (dateTo) query = query.lte('order_date', dateTo)
      if (readyMade && readyMade !== '전체') query = query.eq('ready_made', readyMade)

      // 전광판 모드: 활성 주문 + 최근 건
      if (mode === 'display_board') {
        const today = new Date()
        const lookback = new Date(today)
        lookback.setDate(lookback.getDate() - 15)
        const todayStr = formatDate(today)
        const lookbackStr = formatDate(lookback)

        query = query
          .gte('order_date', lookbackStr)
          .or(`status.eq.주문,status.eq.입고 대기중,status.like.%준비됨%,status.like.%견적%,order_date.eq.${todayStr}`)
      } else if (status && status !== '전체') {
        if (status === '준비됨') {
          query = query.like('status', '%준비됨%')
        } else {
          query = query.eq('status', status)
        }
      }

      query = query.order('order_date', { ascending: false }).order('order_time', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      // 주문 데이터 보강 (고객명, 판매사명, 주문자명, 대표물건)
      const orders = data || []
      if (orders.length > 0) {
        // 1. 고객명 매핑
        const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))]
        const { data: customers } = await supabase
          .from('customers')
          .select('customer_id, customer_name')
          .eq('seller_id', sellerId)
          .in('customer_id', customerIds)
        const customerMap = new Map(
          (customers || []).map(c => [c.customer_id, c.customer_name])
        )

        // 2. 판매사명 매핑
        const { data: sellerCompany } = await supabase
          .from('companies')
          .select('company_id, company_alias, company_name')
          .eq('company_id', sellerId)
          .single()
        const sellerName = sellerCompany?.company_alias || sellerCompany?.company_name || sellerId

        // 3. 주문자명 매핑
        const ordererIds = [...new Set(orders.map(o => o.orderer_id).filter(Boolean))]
        let ordererMap = new Map<string, string>()
        if (ordererIds.length > 0) {
          const { data: orderers } = await supabase
            .from('users')
            .select('user_id, user_name')
            .in('user_id', ordererIds)
          ordererMap = new Map(
            (orderers || []).map(u => [u.user_id, u.user_name])
          )
        }

        // 4. 대표물건 매핑 (orders_d에서 sequence=1인 행의 attribute 조합)
        const orderIds = orders.map(o => o.order_id)
        const { data: firstItems } = await supabase
          .from('orders_d')
          .select('order_id, attribute01, attribute02, attribute03, attribute04, attribute05')
          .eq('seller_id', sellerId)
          .in('order_id', orderIds)
          .eq('sequence', 1)
        const itemMap = new Map<string, string>()
        if (firstItems) {
          for (const item of firstItems) {
            const parts = [item.attribute01, item.attribute02, item.attribute03, item.attribute04, item.attribute05]
              .filter(Boolean)
              .join(' ')
            itemMap.set(item.order_id, parts)
          }
        }

        const enriched = orders.map(order => ({
          ...order,
          customer_name: customerMap.get(order.customer_id) || order.customer_id,
          seller_name: sellerName,
          orderer_name: ordererMap.get(order.orderer_id) || '',
          representative_item: itemMap.get(order.order_id) || '',
        }))

        return NextResponse.json(enriched)
      }

      return NextResponse.json(orders)

    } else if (buyerId) {
      // 구매회사 조회: contracts → orders_m
      const { data: contracts } = await supabase
        .from('contracts')
        .select('seller_id, customer_id, seller_alias')
        .eq('buyer_id', buyerId)

      if (!contracts || contracts.length === 0) {
        return NextResponse.json([])
      }

      const allOrders = []
      for (const contract of contracts) {
        let query = supabase
          .from('orders_m')
          .select('*')
          .eq('seller_id', contract.seller_id)
          .eq('customer_id', contract.customer_id)

        if (dateFrom) query = query.gte('order_date', dateFrom)
        if (dateTo) query = query.lte('order_date', dateTo)
        if (readyMade && readyMade !== '전체') query = query.eq('ready_made', readyMade)

        if (mode === 'display_board') {
          const today = new Date()
          const lookback = new Date(today)
          lookback.setDate(lookback.getDate() - 15)
          const lookbackStr = formatDate(lookback)

          query = query
            .gte('order_date', lookbackStr)
            .or('status.eq.견적 요청,status.eq.견적 응답,status.eq.주문,status.eq.입고 대기중,status.like.%준비됨%,status.eq.수령,status.like.%취소%')
        } else if (status && status !== '전체') {
          if (status === '준비됨') {
            query = query.like('status', '%준비됨%')
          } else {
            query = query.eq('status', status)
          }
        }

        query = query.order('order_date', { ascending: false }).order('order_time', { ascending: false })

        const { data } = await query
        if (data && data.length > 0) {
          // 주문자명 매핑
          const oIds = [...new Set(data.map(o => o.orderer_id).filter(Boolean))]
          let oMap = new Map<string, string>()
          if (oIds.length > 0) {
            const { data: orderers } = await supabase
              .from('users')
              .select('user_id, user_name')
              .in('user_id', oIds)
            oMap = new Map((orderers || []).map(u => [u.user_id, u.user_name]))
          }

          // 대표물건 매핑
          const dOrderIds = data.map(o => o.order_id)
          const { data: firstItems } = await supabase
            .from('orders_d')
            .select('order_id, attribute01, attribute02, attribute03, attribute04, attribute05')
            .eq('seller_id', contract.seller_id)
            .in('order_id', dOrderIds)
            .eq('sequence', 1)
          const iMap = new Map<string, string>()
          if (firstItems) {
            for (const item of firstItems) {
              const parts = [item.attribute01, item.attribute02, item.attribute03, item.attribute04, item.attribute05]
                .filter(Boolean).join(' ')
              iMap.set(item.order_id, parts)
            }
          }

          allOrders.push(...data.map(order => ({
            ...order,
            seller_name: contract.seller_alias || contract.seller_id,
            orderer_name: oMap.get(order.orderer_id) || '',
            representative_item: iMap.get(order.order_id) || '',
          })))
        }
      }

      // 상태별 정렬
      allOrders.sort((a, b) => {
        const ka = getStatusKey(a.status)
        const kb = getStatusKey(b.status)
        if (ka !== kb) return ka - kb
        return (b.order_date || '').localeCompare(a.order_date || '')
      })

      return NextResponse.json(allOrders)
    }

    return NextResponse.json({ error: 'seller_id or buyer_id required' }, { status: 400 })

  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/orders - 새 주문 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      seller_id, order_date, customer_id, ready_made,
      item_count, sum_amount, adjustment, vat, total_amount,
      payment_method, payment_date, comment, status, orderer_id,
      items
    } = body

    // OrderID 생성 (.NET Ticks 호환)
    const ticksPerMs = BigInt(10000)
    const epochOffset = BigInt('621355968000000000')
    const orderId = (BigInt(Date.now()) * ticksPerMs + epochOffset).toString()

    const { error: masterError } = await supabase.from('orders_m').insert({
      seller_id,
      order_id: orderId,
      order_date,
      customer_id,
      ready_made,
      item_count,
      sum_amount,
      adjustment,
      vat,
      total_amount,
      payment_method: payment_method || '',
      payment_date: payment_date || '',
      comment: comment || '',
      status,
      orderer_id,
      order_time: new Date().toISOString(),
    })

    if (masterError) throw masterError

    if (items && items.length > 0) {
      const detailRows = items.map((item: Record<string, unknown>, idx: number) => ({
        seller_id,
        order_id: orderId,
        sequence: idx + 1,
        category_id: item.category_id || '',
        attribute01: item.attribute01 || '',
        attribute02: item.attribute02 || '',
        attribute03: item.attribute03 || '',
        attribute04: item.attribute04 || '',
        attribute05: item.attribute05 || '',
        attribute06: item.attribute06 || '',
        attribute07: item.attribute07 || '',
        attribute08: item.attribute08 || '',
        attribute09: item.attribute09 || '',
        attribute10: item.attribute10 || '',
        price: item.price || 0,
        quantity: item.quantity || 0,
        amount: item.amount || 0,
        vat: item.vat || 0,
        group: item.group || '',
        status: '',
      }))

      const { error: detailError } = await supabase.from('orders_d').insert(detailRows)
      if (detailError) throw detailError
    }

    return NextResponse.json({ order_id: orderId })

  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function getStatusKey(status: string | null): number {
  if (!status) return 99
  if (status.includes('견적')) return 0
  if (status === '입고 대기중') return 1
  if (status === '주문') return 2
  if (status.includes('준비됨')) return 3
  if (status === '수령') return 4
  if (status === '완료') return 5
  return 6
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}
