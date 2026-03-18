import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/orders/[orderId]/details/[sequence]/status
// 개별 품목 준비/재고없음 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; sequence: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, sequence } = await params
  const seq = parseInt(sequence)

  try {
    const body = await request.json()
    const { seller_id, status: newStatus, user_id, order_date } = body

    // 개별 품목 상태 업데이트
    const { error: detailError } = await supabase
      .from('orders_d')
      .update({ status: newStatus })
      .eq('seller_id', seller_id)
      .eq('order_id', orderId)
      .eq('sequence', seq)

    if (detailError) throw detailError

    // 전체 품목 상태 확인하여 마스터 상태 결정
    const { data: allDetails } = await supabase
      .from('orders_d')
      .select('sequence, status, amount, vat')
      .eq('seller_id', seller_id)
      .eq('order_id', orderId)
      .order('sequence')

    if (!allDetails) throw new Error('품목 조회 실패')

    const unprocessed = allDetails.filter(d => !d.status || d.status === '')
    const readyItems = allDetails.filter(d => d.status === '준비됨')
    const noStockItems = allDetails.filter(d => d.status === '재고없음')

    let masterStatus: string

    if (unprocessed.length > 0) {
      // 아직 미처리 품목이 있음
      masterStatus = '일부 준비됨'
    } else {
      // 모든 품목 처리 완료
      masterStatus = readyItems.length > 0 ? '전부 준비됨' : '준비됨'

      // 합계 재계산 (준비됨 품목만)
      const newSumAmount = readyItems.reduce((sum, d) => sum + Number(d.amount), 0)
      const newVat = readyItems.reduce((sum, d) => sum + Number(d.vat), 0)

      await supabase
        .from('orders_m')
        .update({
          item_count: readyItems.length,
          sum_amount: newSumAmount,
          vat: newVat,
          total_amount: newSumAmount + newVat,
          status: masterStatus,
          ready_id: user_id,
          ready_time: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .eq('seller_id', seller_id)

      // 재고없음 품목이 있으면 별도 주문(입고 대기중)으로 분리
      if (noStockItems.length > 0) {
        const ticksPerMs = BigInt(10000)
        const epochOffset = BigInt('621355968000000000')
        const newOrderId = (BigInt(Date.now()) * ticksPerMs + epochOffset).toString()

        const noStockAmount = noStockItems.reduce((sum, d) => sum + Number(d.amount), 0)
        const noStockVat = noStockItems.reduce((sum, d) => sum + Number(d.vat), 0)

        // 원본 주문 정보 가져오기
        const { data: origOrder } = await supabase
          .from('orders_m')
          .select('customer_id, ready_made, orderer_id, comment')
          .eq('order_id', orderId)
          .eq('seller_id', seller_id)
          .single()

        if (origOrder) {
          // 새 주문 마스터 생성 (입고 대기중)
          await supabase.from('orders_m').insert({
            seller_id,
            order_id: newOrderId,
            order_date: order_date || formatToday(),
            customer_id: origOrder.customer_id,
            ready_made: origOrder.ready_made,
            item_count: noStockItems.length,
            sum_amount: noStockAmount,
            adjustment: 0,
            vat: noStockVat,
            total_amount: noStockAmount + noStockVat,
            comment: origOrder.comment || '',
            status: '입고 대기중',
            orderer_id: origOrder.orderer_id,
            order_time: new Date().toISOString(),
          })

          // 재고없음 품목을 새 주문으로 복사
          for (let i = 0; i < noStockItems.length; i++) {
            const origDetail = await supabase
              .from('orders_d')
              .select('*')
              .eq('seller_id', seller_id)
              .eq('order_id', orderId)
              .eq('sequence', noStockItems[i].sequence)
              .single()

            if (origDetail.data) {
              const { seller_id: _s, order_id: _o, sequence: _sq, ...rest } = origDetail.data
              await supabase.from('orders_d').insert({
                ...rest,
                seller_id,
                order_id: newOrderId,
                sequence: i + 1,
                status: '',
              })
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        master_status: masterStatus,
        split_order_id: noStockItems.length > 0 ? 'created' : null,
      })
    }

    // 일부 준비됨인 경우 마스터 상태만 업데이트
    await supabase
      .from('orders_m')
      .update({ status: masterStatus })
      .eq('order_id', orderId)
      .eq('seller_id', seller_id)

    return NextResponse.json({
      success: true,
      master_status: masterStatus,
    })

  } catch (error) {
    console.error('PATCH detail status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function formatToday(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
