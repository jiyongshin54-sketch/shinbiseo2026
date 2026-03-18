import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 상태 전이 규칙
const VALID_TRANSITIONS: Record<string, string[]> = {
  '준비됨': ['주문', '입고 대기중'],
  '수령': ['준비됨', '일부 준비됨', '전부 준비됨'],
  '완료': ['수령'],
  '견적 취소': ['견적 요청', '견적 응답'],
  '주문 취소': ['주문', '입고 대기중'],
  '준비됨 취소': ['준비됨', '전부 준비됨', '일부 준비됨'],
  '수령 취소': ['수령'],
  '완료 취소': ['완료'],
}

// PATCH /api/orders/[orderId]/status - 주문 마스터 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const body = await request.json()
    const { seller_id, new_status, user_id, payment_method, remark, order_date } = body

    // 현재 주문 상태 확인
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders_m')
      .select('status, ready_made, sum_amount, vat, total_amount')
      .eq('order_id', orderId)
      .eq('seller_id', seller_id)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 상태 전이 규칙 검증
    const allowedFrom = VALID_TRANSITIONS[new_status]
    if (allowedFrom && !allowedFrom.includes(currentOrder.status || '')) {
      return NextResponse.json({
        error: `"${currentOrder.status}"에서 "${new_status}"(으)로 변경할 수 없습니다.`
      }, { status: 400 })
    }

    // 상태별 업데이트 필드 구성
    const updateFields: Record<string, unknown> = { status: new_status }
    const now = new Date().toISOString()

    switch (new_status) {
      case '준비됨':
        updateFields.ready_id = user_id
        updateFields.ready_time = now
        // 모든 OrdersD도 준비됨으로
        await supabase
          .from('orders_d')
          .update({ status: '준비됨' })
          .eq('order_id', orderId)
          .eq('seller_id', seller_id)
          .eq('status', '')
        break

      case '수령':
        updateFields.receive_id = user_id
        updateFields.receive_time = now
        break

      case '완료':
        updateFields.finish_id = user_id
        updateFields.finish_time = now
        if (payment_method) {
          updateFields.payment_method = payment_method
          updateFields.payment_date = order_date || formatToday()
        }
        // 부가세 재계산 (카드 결제 또는 부가가치세 비고)
        if (remark === '부가가치세' || payment_method === '카드') {
          const vatAmount = Math.round(Number(currentOrder.sum_amount) * 0.1)
          updateFields.vat = vatAmount
          updateFields.total_amount = Number(currentOrder.sum_amount) + vatAmount
        }
        break

      case '견적 취소':
      case '주문 취소':
      case '준비됨 취소':
      case '수령 취소':
      case '완료 취소':
        updateFields.cancel_id = user_id
        updateFields.cancel_time = now
        break
    }

    const { error: updateError } = await supabase
      .from('orders_m')
      .update(updateFields)
      .eq('order_id', orderId)
      .eq('seller_id', seller_id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, new_status })

  } catch (error) {
    console.error('PATCH /api/orders/[orderId]/status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function formatToday(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
