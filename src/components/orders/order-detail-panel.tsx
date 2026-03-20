'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DisplayBoardOrder, OrderDetail } from '@/lib/types'
import { PAYMENT_METHOD } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  order: DisplayBoardOrder
  onClose: () => void
  onStatusChanged: () => void
}

export function OrderDetailPanel({ order, onClose, onStatusChanged }: Props) {
  const { user, isSeller, isBuyer, canPrepareItems, canConfirmPayment, canActOnOthersOrder } = useAuth()
  const [details, setDetails] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('현금')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchDetails()
  }, [order.order_id, order.seller_id])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/orders/${order.order_id}/details?seller_id=${order.seller_id}`
      )
      const data = await res.json()
      if (Array.isArray(data)) setDetails(data)
    } catch (error) {
      console.error('상세 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 마스터 상태 변경
  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id,
          new_status: newStatus,
          user_id: user?.userId,
          payment_method: newStatus === '완료' ? paymentMethod : undefined,
          order_date: order.order_date,
        }),
      })
      const result = await res.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${newStatus} 처리 완료`)
        onStatusChanged()
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  // 개별 품목 준비/재고없음
  const handleDetailStatus = async (sequence: number, status: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/orders/${order.order_id}/details/${sequence}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seller_id: order.seller_id,
            status,
            user_id: user?.userId,
            order_date: order.order_date,
          }),
        }
      )
      const result = await res.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`품목 ${status} 처리`)
        fetchDetails()
        if (result.master_status !== '일부 준비됨') {
          onStatusChanged()
        }
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  // 완료 처리 단축 (모든 품목 준비 → 대리수령 → 완료)
  const handleQuickComplete = async () => {
    setActionLoading(true)
    try {
      // 1. 전체 준비됨
      await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id,
          new_status: '준비됨',
          user_id: user?.userId,
        }),
      })
      // 2. 대리 수령
      await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id,
          new_status: '수령',
          user_id: user?.userId,
        }),
      })
      // 3. 완료
      const res = await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id,
          new_status: '완료',
          user_id: user?.userId,
          payment_method: paymentMethod,
          order_date: order.order_date,
        }),
      })
      const result = await res.json()
      if (result.error) toast.error(result.error)
      else {
        toast.success('완료 처리 완료')
        onStatusChanged()
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  const isCustom = order.ready_made === '맞춤'
  const status = order.status || ''
  const canAct = canActOnOthersOrder || order.orderer_id === user?.userId

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            주문 상세 — {order.order_date} / {order.ready_made}
            <Badge className="ml-2">{status}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 상세 품목 테이블 */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-center">#</th>
                <th className="p-2 text-left">품명</th>
                <th className="p-2 text-left">색깔</th>
                <th className="p-2 text-left">두께</th>
                <th className="p-2 text-left">{isCustom ? '폭×길이' : '사이즈'}</th>
                {isCustom && <th className="p-2 text-left">인쇄명</th>}
                {isCustom && <th className="p-2 text-left">도수</th>}
                <th className="p-2 text-right">단가</th>
                <th className="p-2 text-right">수량</th>
                <th className="p-2 text-right">금액</th>
                <th className="p-2 text-center">상태</th>
                {canPrepareItems && status === '주문' && (
                  <th className="p-2 text-center">액션</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="p-4 text-center">로딩 중...</td></tr>
              ) : details.length === 0 ? (
                <tr><td colSpan={12} className="p-4 text-center">품목이 없습니다.</td></tr>
              ) : (
                details.map((d) => (
                  <tr key={d.sequence} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-center">{d.sequence}</td>
                    <td className="p-2">{d.attribute01}</td>
                    <td className="p-2">{d.attribute02}</td>
                    <td className="p-2">{d.attribute03}</td>
                    <td className="p-2">{d.attribute04}</td>
                    {isCustom && <td className="p-2">{d.attribute05}</td>}
                    {isCustom && <td className="p-2">{d.attribute06}</td>}
                    <td className="p-2 text-right">{Number(d.price).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(d.quantity).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(d.amount).toLocaleString()}</td>
                    <td className="p-2 text-center">
                      {d.status ? (
                        <Badge variant={d.status === '준비됨' ? 'default' : 'destructive'} className="text-xs">
                          {d.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">대기</span>
                      )}
                    </td>
                    {canPrepareItems && status === '주문' && (
                      <td className="p-2 text-center space-x-1">
                        {(!d.status || d.status === '') && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs h-7"
                              disabled={actionLoading}
                              onClick={() => handleDetailStatus(d.sequence, '준비됨')}
                            >
                              준비
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7"
                              disabled={actionLoading}
                              onClick={() => handleDetailStatus(d.sequence, '재고없음')}
                            >
                              재고없음
                            </Button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 합계 */}
        <div className="flex justify-end gap-4 text-sm">
          <span>공급가: <strong>{Number(order.sum_amount).toLocaleString()}</strong></span>
          {Number(order.adjustment) !== 0 && (
            <span>조정: <strong>{Number(order.adjustment).toLocaleString()}</strong></span>
          )}
          <span>부가세: <strong>{Number(order.vat).toLocaleString()}</strong></span>
          <span>합계: <strong className="text-lg">{Number(order.total_amount).toLocaleString()}</strong></span>
        </div>

        {/* 액션 버튼 */}
        {canAct && (
          <div className="flex items-center gap-2 flex-wrap border-t pt-3">
            {/* 판매회사: 주문 → 완료 처리 단축 */}
            {isSeller && status === '주문' && (
              <>
                <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PAYMENT_METHOD).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleQuickComplete} disabled={actionLoading}>
                  완료 처리 (단축)
                </Button>
              </>
            )}

            {/* 준비됨 → 수령 */}
            {(status.includes('준비됨')) && (
              <Button size="sm" onClick={() => handleStatusChange('수령')} disabled={actionLoading}>
                {isSeller ? '대리 수령' : '수령 확인'}
              </Button>
            )}

            {/* 수령 → 완료 (판매회사) */}
            {isSeller && status === '수령' && canConfirmPayment && (
              <>
                <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PAYMENT_METHOD).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => handleStatusChange('완료')} disabled={actionLoading}>
                  결제 완료
                </Button>
              </>
            )}

            {/* 견적 응답 (판매회사, 맞춤품) */}
            {isSeller && status === '견적 요청' && (
              <Button size="sm" onClick={() => handleStatusChange('견적 응답')} disabled={actionLoading}>
                견적 응답
              </Button>
            )}

            {/* 주문 확정 (구매회사, 맞춤품) */}
            {isBuyer && status === '견적 응답' && (
              <Button size="sm" onClick={() => handleStatusChange('주문')} disabled={actionLoading}>
                주문 확정
              </Button>
            )}

            {/* 취소 버튼 */}
            {status === '견적 요청' || status === '견적 응답' ? (
              <Button size="sm" variant="destructive" onClick={() => handleStatusChange('견적 취소')} disabled={actionLoading}>
                견적 취소
              </Button>
            ) : status === '주문' || status === '입고 대기중' ? (
              <Button size="sm" variant="destructive" onClick={() => handleStatusChange('주문 취소')} disabled={actionLoading}>
                주문 취소
              </Button>
            ) : null}

            {/* 수령 취소: 판매회사 + 본인 주문건만 */}
            {isSeller && status === '수령' && order.orderer_id === user?.userId && (
              <Button size="sm" variant="destructive" onClick={() => handleStatusChange('수령 취소')} disabled={actionLoading}>
                수령 취소
              </Button>
            )}

            {/* 완료 취소: 판매회사 + 본인 주문건만 */}
            {isSeller && status === '완료' && order.orderer_id === user?.userId && (
              <Button size="sm" variant="destructive" onClick={() => handleStatusChange('완료 취소')} disabled={actionLoading}>
                완료 취소
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
