import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trading-stubs/by-order?order_id=xxx&seller_id=xxx
// 주문 기반 거래명세표 조회 (기존 발급분 or 주문 데이터로 구성)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const orderId = params.get('order_id')
  const sellerId = params.get('seller_id')

  if (!orderId || !sellerId) {
    return NextResponse.json({ error: 'order_id, seller_id required' }, { status: 400 })
  }

  try {
    // 1. 기존 발급된 명세표가 있는지 확인
    const { data: existingStub } = await supabase
      .from('trading_stubs_m')
      .select('*')
      .eq('order_id', orderId)
      .single()

    // 2. 주문 마스터 조회
    const { data: orderM } = await supabase
      .from('orders_m')
      .select('*')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId)
      .single()

    if (!orderM) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 3. 주문 상세 조회
    const { data: orderDetails } = await supabase
      .from('orders_d')
      .select('*')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId)
      .order('sequence', { ascending: true })

    // 4. 판매 회사 정보
    const { data: sellerCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', sellerId)
      .single()

    // 5. 구매 회사 정보 - customer에서 company_id 조회
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('customer_id', orderM.customer_id)
      .single()

    let buyerCompany = null
    if (customer?.company_id) {
      const { data: bc } = await supabase
        .from('companies')
        .select('*')
        .eq('company_id', customer.company_id)
        .single()
      buyerCompany = bc
    }

    // 6. 카테고리 조회
    const categoryIds = [...new Set((orderDetails || []).map(d => d.category_id).filter(Boolean))]
    let categoryMap: Record<string, string> = {}
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('categories')
        .select('category_id, category_l, category_m, category_s')
        .in('category_id', categoryIds)
      if (categories) {
        categoryMap = Object.fromEntries(
          categories.map(c => [
            c.category_id,
            [c.category_l, c.category_m, c.category_s].filter(Boolean).join(' - ')
          ])
        )
      }
    }

    // 7. 응답 구성
    const items = (orderDetails || []).map(d => ({
      sequence: d.sequence,
      category_id: categoryMap[d.category_id] || d.category_id || '',
      description: d.attribute01 || '',
      standard: d.attribute04 || '',
      unit_price: Number(d.price) || 0,
      quantity: Number(d.quantity) || 0,
      amount: Number(d.amount) || 0,
      vat: 0,
      d_comment: '',
    }))

    const result = {
      ts_id: existingStub?.ts_id || '',
      issue_date: existingStub?.issue_date || orderM.order_date || '',
      sum_amount: existingStub ? Number(existingStub.sum_amount) : Number(orderM.sum_amount) || 0,
      sum_vat: existingStub ? Number(existingStub.sum_vat) : Number(orderM.vat) || 0,
      total_amount: existingStub ? Number(existingStub.total_amount) : Number(orderM.total_amount) || 0,
      payment_method: existingStub?.payment_method || orderM.payment_method || '',
      comment: existingStub?.comment || '',
      items: existingStub ? undefined : items, // 기존 발급분이면 detail에서 가져옴
      seller: {
        company_name: sellerCompany?.company_name || '',
        biz_no: sellerCompany?.biz_no || '',
        representative: sellerCompany?.representative || '',
        address: sellerCompany?.address || '',
        biz_type: sellerCompany?.biz_type || '',
        biz_category: sellerCompany?.biz_category || '',
        phone: sellerCompany?.phone || '',
      },
      buyer: {
        company_name: customer?.customer_name || buyerCompany?.company_name || '',
        biz_no: buyerCompany?.biz_no || '',
        representative: buyerCompany?.representative || customer?.customer_name || '',
        address: buyerCompany?.address || '',
        biz_type: buyerCompany?.biz_type || '',
        biz_category: buyerCompany?.biz_category || '',
        phone: buyerCompany?.phone || '',
      },
    }

    // 기존 발급분이면 detail도 조회
    if (existingStub) {
      const { data: stubDetails } = await supabase
        .from('trading_stubs_d')
        .select('*')
        .eq('ts_id', existingStub.ts_id)
        .order('sequence', { ascending: true })

      result.items = (stubDetails || []).map(d => ({
        sequence: d.sequence,
        category_id: d.category_id || '',
        description: d.description || '',
        standard: d.standard || '',
        unit_price: Number(d.unit_price) || 0,
        quantity: Number(d.quantity) || 0,
        amount: Number(d.amount) || 0,
        vat: Number(d.vat) || 0,
        d_comment: d.d_comment || '',
      }))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/trading-stubs/by-order error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
