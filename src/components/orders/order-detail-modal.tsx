'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DisplayBoardOrder, OrderDetail } from '@/lib/types'
import { PAYMENT_METHOD } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  order: DisplayBoardOrder | null
  open: boolean
  onClose: () => void
  onStatusChanged: () => void
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  '견적 요청': { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  '견적 응답': { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  '주문': { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  '준비됨': { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  '일부 준비됨': { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  '수령': { bg: '#f5f5f4', text: '#57534e', border: '#a8a29e' },
  '완료': { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  '취소': { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  '주문 취소': { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  '견적 취소': { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
}

export function OrderDetailModal({ order, open, onClose, onStatusChanged }: Props) {
  const { user, isSeller, isBuyer, canPrepareItems, canConfirmPayment, canActOnOthersOrder } = useAuth()
  const [details, setDetails] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('현금')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (order && open) fetchDetails()
  }, [order?.order_id, order?.seller_id, open])

  const fetchDetails = async () => {
    if (!order) return
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

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
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
        onClose()
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDetailStatus = async (sequence: number, status: string) => {
    if (!order) return
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
        onStatusChanged()
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  const handleQuickComplete = async () => {
    if (!order) return
    setActionLoading(true)
    try {
      await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: order.seller_id, new_status: '준비됨', user_id: user?.userId }),
      })
      await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: order.seller_id, new_status: '수령', user_id: user?.userId }),
      })
      const res = await fetch(`/api/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id, new_status: '완료', user_id: user?.userId,
          payment_method: paymentMethod, order_date: order.order_date,
        }),
      })
      const result = await res.json()
      if (result.error) toast.error(result.error)
      else {
        toast.success('완료 처리 완료')
        onStatusChanged()
        onClose()
      }
    } catch {
      toast.error('처리 실패')
    } finally {
      setActionLoading(false)
    }
  }

  if (!order) return null

  const isCustom = order.ready_made === '맞춤'
  const status = order.status || ''
  const canAct = canActOnOthersOrder || order.orderer_id === user?.userId
  const sc = statusColors[status] || { bg: '#f5f5f4', text: '#57534e', border: '#a8a29e' }

  const totalSupply = Number(order.sum_amount) || 0
  const adjustment = Number(order.adjustment) || 0
  const vat = Number(order.vat) || 0
  const totalAmount = Number(order.total_amount) || 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="!max-w-[1200px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl shadow-2xl">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-bold text-white">
              주문 상세
            </DialogTitle>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
            >
              {status}
            </span>
          </div>
          {/* 주문 요약 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
            <SummaryItem label="주문일자" value={order.order_date || ''} light />
            <SummaryItem label="구매사" value={order.customer_name || order.customer_id || ''} light />
            <SummaryItem label="주문자" value={order.orderer_name || ''} light />
            <SummaryItem label="구분" value={order.ready_made || ''} light highlight />
            <SummaryItem label="대표물건" value={order.representative_item || ''} light />
          </div>
        </DialogHeader>

        {/* 품목 테이블 */}
        <div className="flex-1 overflow-auto px-6 py-5 bg-gray-50">
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <th className="px-3 py-3 text-center font-semibold text-gray-500 w-10">#</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">품명</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">색깔</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">두께</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">{isCustom ? '폭×길이' : '사이즈'}</th>
                  {isCustom && <th className="px-3 py-3 text-left font-semibold text-gray-600">인쇄명</th>}
                  {isCustom && <th className="px-3 py-3 text-center font-semibold text-gray-600">도수</th>}
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">단가</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">수량</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">금액</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">상태</th>
                  {canPrepareItems && status === '주문' && (
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">액션</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">품목을 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : details.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-sm">품목이 없습니다.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  details.map((d, idx) => (
                    <tr
                      key={d.sequence}
                      className={`border-t border-gray-100 transition-colors hover:bg-blue-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{d.sequence}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{d.attribute01}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.attribute02}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{d.attribute03}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.attribute04}</td>
                      {isCustom && <td className="px-3 py-2.5 text-gray-600">{d.attribute05}</td>}
                      {isCustom && <td className="px-3 py-2.5 text-center text-gray-600">{d.attribute06}</td>}
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{Number(d.price).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{Number(d.quantity).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">{Number(d.amount).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <DetailStatusBadge status={d.status} />
                      </td>
                      {canPrepareItems && status === '주문' && (
                        <td className="px-3 py-2.5 text-center">
                          {(!d.status || d.status === '') && (
                            <div className="flex gap-1 justify-center">
                              <button
                                className="px-2.5 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-all shadow-sm"
                                disabled={actionLoading}
                                onClick={() => handleDetailStatus(d.sequence, '준비됨')}
                              >
                                준비
                              </button>
                              <button
                                className="px-2.5 py-1 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all shadow-sm"
                                disabled={actionLoading}
                                onClick={() => handleDetailStatus(d.sequence, '재고없음')}
                              >
                                재고없음
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 합계 영역 */}
          <div className="mt-5 flex justify-end">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 min-w-[320px]">
              <div className="flex justify-between items-center py-1.5 text-sm text-gray-600">
                <span>공급가</span>
                <span className="tabular-nums font-medium">{totalSupply.toLocaleString()}원</span>
              </div>
              {adjustment !== 0 && (
                <div className="flex justify-between items-center py-1.5 text-sm text-gray-600">
                  <span>합계조정</span>
                  <span className={`tabular-nums font-medium ${adjustment < 0 ? 'text-red-500' : ''}`}>
                    {adjustment > 0 ? '+' : ''}{adjustment.toLocaleString()}원
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 text-sm text-gray-600">
                <span>부가세</span>
                <span className="tabular-nums font-medium">{vat.toLocaleString()}원</span>
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2.5 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-base">합계</span>
                <span className="tabular-nums font-bold text-lg text-blue-600">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 영역 */}
        {canAct && (
          <div className="border-t bg-white px-6 py-4 flex items-center gap-2 flex-wrap">
            {/* 판매회사: 주문 → 완료 단축 */}
            {isSeller && status === '주문' && (
              <>
                <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                  <SelectTrigger className="w-[110px] h-9 text-sm bg-gray-50 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PAYMENT_METHOD).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-sm"
                  onClick={handleQuickComplete}
                  disabled={actionLoading}
                >
                  ✓ 완료 처리 (단축)
                </Button>
              </>
            )}

            {/* 준비됨 → 수령 */}
            {status.includes('준비됨') && (
              <Button size="sm" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('수령')} disabled={actionLoading}>
                {isSeller ? '대리 수령' : '수령 확인'}
              </Button>
            )}

            {/* 수령 → 완료 */}
            {isSeller && status === '수령' && canConfirmPayment && (
              <>
                <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                  <SelectTrigger className="w-[110px] h-9 text-sm bg-gray-50 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PAYMENT_METHOD).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-sm"
                  onClick={() => handleStatusChange('완료')}
                  disabled={actionLoading}
                >
                  ✓ 결제 완료
                </Button>
              </>
            )}

            {/* 견적 응답 */}
            {isSeller && status === '견적 요청' && (
              <Button size="sm" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('견적 응답')} disabled={actionLoading}>
                견적 응답
              </Button>
            )}

            {/* 주문 확정 */}
            {isBuyer && status === '견적 응답' && (
              <Button size="sm" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('주문')} disabled={actionLoading}>
                주문 확정
              </Button>
            )}

            <div className="flex-1" />

            {/* 취소 버튼들 */}
            {(status === '견적 요청' || status === '견적 응답') && (
              <Button size="sm" variant="destructive" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('견적 취소')} disabled={actionLoading}>
                견적 취소
              </Button>
            )}
            {(status === '주문' || status === '입고 대기중') && (
              <Button size="sm" variant="destructive" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('주문 취소')} disabled={actionLoading}>
                주문 취소
              </Button>
            )}
            {isSeller && status === '수령' && order.orderer_id === user?.userId && (
              <Button size="sm" variant="destructive" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('수령 취소')} disabled={actionLoading}>
                수령 취소
              </Button>
            )}
            {isSeller && status === '완료' && order.orderer_id === user?.userId && (
              <Button size="sm" variant="destructive" className="h-9 px-4 shadow-sm" onClick={() => handleStatusChange('완료 취소')} disabled={actionLoading}>
                완료 취소
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 헤더 요약 아이템
function SummaryItem({ label, value, light, highlight }: { label: string; value: string; light?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-xs mb-0.5 ${light ? 'text-white/60' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-sm font-semibold ${light ? 'text-white' : 'text-gray-800'} ${highlight ? '!text-yellow-300' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

// 품목 상태 뱃지
function DetailStatusBadge({ status }: { status: string | null }) {
  if (!status || status === '') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-100">대기</span>
  }
  if (status === '준비됨') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 ring-1 ring-green-200">
        ✓ 준비됨
      </span>
    )
  }
  if (status === '재고없음') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-200">
        ✕ 재고없음
      </span>
    )
  }
  return <span className="text-xs">{status}</span>
}
