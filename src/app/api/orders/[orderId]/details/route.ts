import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/orders/[orderId]/details - 주문 상세 품목 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params
  const sellerId = request.nextUrl.searchParams.get('seller_id')

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('orders_d')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('order_id', orderId)
      .order('sequence', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/orders/[orderId]/details error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
