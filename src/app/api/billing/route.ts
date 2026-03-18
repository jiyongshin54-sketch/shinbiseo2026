import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/billing - 미수금 조회
// ?seller_id=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sellerId = request.nextUrl.searchParams.get('seller_id')
  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  }

  try {
    // 미수금: 준비됨/일부준비됨/전부준비됨/수령 상태인 주문의 합계
    const { data: orders, error } = await supabase
      .from('orders_m')
      .select('customer_id, total_amount, status')
      .eq('seller_id', sellerId)
      .or('status.eq.준비됨,status.eq.일부 준비됨,status.eq.전부 준비됨,status.eq.수령')

    if (error) throw error

    // 고객 목록 가져오기
    const { data: customers } = await supabase
      .from('customers')
      .select('customer_id, customer_name, payment')
      .eq('seller_id', sellerId)

    const customerMap = new Map(
      (customers || []).map(c => [c.customer_id, c])
    )

    // 고객별 합산
    const receivables: Record<string, { customer_id: string; customer_name: string; payment: string; total: number }> = {}

    for (const order of orders || []) {
      const cid = order.customer_id || ''
      if (!receivables[cid]) {
        const cust = customerMap.get(cid)
        receivables[cid] = {
          customer_id: cid,
          customer_name: cust?.customer_name || cid,
          payment: cust?.payment || '',
          total: 0,
        }
      }
      receivables[cid].total += Number(order.total_amount) || 0
    }

    const result = Object.values(receivables).sort((a, b) => b.total - a.total)

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/billing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
