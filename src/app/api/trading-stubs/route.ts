import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trading-stubs - 거래명세표 목록
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const sellerId = params.get('seller_id')
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const customerId = params.get('customer_id')

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('trading_stubs_m')
      .select('*')
      .eq('seller_id', sellerId)

    if (dateFrom) query = query.gte('issue_date', dateFrom)
    if (dateTo) query = query.lte('issue_date', dateTo)
    if (customerId) query = query.eq('customer_id', customerId)

    query = query.order('issue_date', { ascending: false })

    const { data, error } = await query
    if (error) throw error

    // 고객명 별도 조회
    const stubs = data || []
    if (stubs.length > 0) {
      const custIds = [...new Set(stubs.map(s => s.customer_id).filter(Boolean))]
      const { data: customers } = await supabase
        .from('customers')
        .select('customer_id, customer_name')
        .eq('seller_id', sellerId)
        .in('customer_id', custIds)
      const custMap = new Map((customers || []).map(c => [c.customer_id, c.customer_name]))
      const enriched = stubs.map(s => ({
        ...s,
        customer_name: custMap.get(s.customer_id) || s.customer_id,
      }))
      return NextResponse.json(enriched)
    }
    return NextResponse.json(stubs)
  } catch (error) {
    console.error('GET /api/trading-stubs error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/trading-stubs - 거래명세표 발행
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { seller_id, order_id, customer_id, issue_date, items, ...rest } = body

    // 동일 주문에 대한 기존 거래명세표 확인
    if (order_id) {
      const { data: existing } = await supabase
        .from('trading_stubs_m')
        .select('ts_id')
        .eq('order_id', order_id)
        .single()

      if (existing) {
        return NextResponse.json({ ts_id: existing.ts_id, exists: true })
      }
    }

    // TsID 생성
    const ticksPerMs = BigInt(10000)
    const epochOffset = BigInt('621355968000000000')
    const tsId = (BigInt(Date.now()) * ticksPerMs + epochOffset).toString()

    const { data: dbUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_uid', user.id)
      .single()

    // trading_stubs_m INSERT
    const { error: masterError } = await supabase.from('trading_stubs_m').insert({
      ts_id: tsId,
      seller_id,
      order_id: order_id || '',
      customer_id,
      issue_date,
      item_count: items?.length || 0,
      status: '등록',
      issuer_id: dbUser?.user_id || '',
      issue_time: new Date().toISOString(),
      ...rest,
    })

    if (masterError) throw masterError

    // trading_stubs_d INSERT
    if (items && items.length > 0) {
      const detailRows = items.map((item: Record<string, unknown>, idx: number) => ({
        ts_id: tsId,
        sequence: idx + 1,
        ...item,
      }))

      const { error: detailError } = await supabase.from('trading_stubs_d').insert(detailRows)
      if (detailError) throw detailError
    }

    return NextResponse.json({ ts_id: tsId })
  } catch (error) {
    console.error('POST /api/trading-stubs error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
