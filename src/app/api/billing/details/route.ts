import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/billing/details - 청구서 상세 (품목별)
// ?seller_id=xxx&customer_id=xxx&period=이번달|지난달
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const sellerId = params.get('seller_id')
  const customerId = params.get('customer_id')
  const period = params.get('period') || '이번달'

  if (!sellerId || !customerId) {
    return NextResponse.json({ error: 'seller_id and customer_id required' }, { status: 400 })
  }

  // 기간 계산
  const now = new Date()
  let startDate: string, endDate: string

  if (period === '지난달') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    startDate = formatDate(lastMonth)
    endDate = formatDate(lastDay)
  } else {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    startDate = formatDate(firstDay)
    endDate = formatDate(now)
  }

  try {
    // 주문 마스터 조회 (미수금 상태)
    const { data: orders, error: ordersError } = await supabase
      .from('orders_m')
      .select('order_id, order_date, ready_made, sum_amount, vat, total_amount, adjustment')
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .or('status.eq.준비됨,status.eq.일부 준비됨,status.eq.전부 준비됨,status.eq.수령')
      .order('order_date', { ascending: true })

    if (ordersError) throw ordersError

    // 각 주문의 상세 품목 조회
    const orderIds = (orders || []).map(o => o.order_id)
    let allDetails: Record<string, unknown>[] = []

    if (orderIds.length > 0) {
      const { data: details, error: detailsError } = await supabase
        .from('orders_d')
        .select('*')
        .in('order_id', orderIds)
        .order('sequence', { ascending: true })

      if (detailsError) throw detailsError
      allDetails = details || []
    }

    // 주문별 상세 품목을 청구서 형태로 매핑
    const billingItems: Record<string, unknown>[] = []
    let seq = 1

    for (const order of orders || []) {
      const orderDetails = allDetails.filter((d: any) => d.order_id === order.order_id)

      for (const d of orderDetails) {
        const detail = d as any
        const amount = Number(detail.amount) || 0
        const vat = Math.round(amount / 10)
        billingItems.push({
          sequence: seq++,
          order_date: order.order_date,
          ready_made: order.ready_made,
          attribute01: detail.attribute01 || '',
          attribute02: detail.attribute02 || '',
          attribute03: detail.attribute03 || '',
          attribute04: detail.attribute04 || '',
          color_count: detail.attribute06 || '',
          print_name: detail.attribute07 || '',
          process_method: detail.attribute08 || '',
          quantity: Number(detail.quantity) || 0,
          unit_price: Number(detail.price) || 0,
          amount,
          vat,
          total: amount + vat,
        })
      }
    }

    // 거래처 정보
    const { data: customer } = await supabase
      .from('customers')
      .select('customer_name, phone_number, payment')
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)
      .single()

    // 판매회사 정보
    const { data: company } = await supabase
      .from('companies')
      .select('company_name, phone_number, account, owner_name, address, uptae, jongmok, business_id')
      .eq('company_id', sellerId)
      .single()

    return NextResponse.json({
      items: billingItems,
      customer: customer || { customer_name: customerId },
      company: company || {},
      period: { startDate, endDate, label: period },
      summary: {
        count: billingItems.length,
        sumAmount: billingItems.reduce((s, i: any) => s + i.amount, 0),
        sumVat: billingItems.reduce((s, i: any) => s + i.vat, 0),
        total: billingItems.reduce((s, i: any) => s + i.total, 0),
      },
    })
  } catch (error) {
    console.error('GET /api/billing/details error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
