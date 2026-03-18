'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderDetailPanel } from './order-detail-panel'
import { AUTO_REFRESH_INTERVAL } from '@/lib/constants'
import type { DisplayBoardOrder } from '@/lib/types'
import { toast } from 'sonner'

export function DisplayBoard() {
  const { user, isSeller, isBuyer, canAutoRefresh, canViewAmountInList } = useAuth()
  const [orders, setOrders] = useState<DisplayBoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<DisplayBoardOrder | null>(null)
  const [readyMadeFilter, setReadyMadeFilter] = useState('전체')
  const [autoRefresh, setAutoRefresh] = useState(canAutoRefresh)
  const prevCountRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    if (!user) return

    const params = new URLSearchParams({ mode: 'display_board' })
    if (isSeller) {
      params.set('seller_id', user.companyId)
    } else {
      params.set('buyer_id', user.companyId)
    }
    if (readyMadeFilter !== '전체') {
      params.set('ready_made', readyMadeFilter)
    }

    try {
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        // 새 주문 감지 (판매회사)
        if (isSeller && prevCountRef.current > 0 && data.length > prevCountRef.current) {
          toast.info('새 주문이 들어왔습니다!')
          try { new Audio('/alarm.wav').play() } catch {}
        }
        prevCountRef.current = data.length
        setOrders(data)
      }
    } catch (error) {
      console.error('주문 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [user, isSeller, readyMadeFilter])

  // 초기 로드 + 자동 리프레시
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!autoRefresh || !canAutoRefresh) return
    const interval = setInterval(fetchOrders, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefresh, canAutoRefresh, fetchOrders])

  const getRowColor = (status: string | null, readyMade: string | null): string => {
    if (!status) return ''
    if (status.includes('견적')) return 'bg-lime-200'
    if (status === '주문' && readyMade === '기성') return 'bg-yellow-200'
    if (status === '주문' && readyMade === '맞춤') return 'bg-sky-200'
    if (status === '입고 대기중') return 'bg-gray-200'
    if (status.includes('준비됨') && readyMade === '기성') return 'bg-orange-300'
    if (status.includes('준비됨') && readyMade === '맞춤') return 'bg-pink-400 text-white'
    if (status === '수령') return 'bg-blue-100'
    if (status === '완료') return 'bg-gray-100'
    return ''
  }

  const formatAmount = (amount: number | null): string => {
    if (amount == null) return ''
    if (!canViewAmountInList) return '*****'
    return Number(amount).toLocaleString()
  }

  if (!user) return null

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={readyMadeFilter} onValueChange={(v) => v && setReadyMadeFilter(v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체</SelectItem>
            <SelectItem value="기성">기성</SelectItem>
            <SelectItem value="맞춤">맞춤</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchOrders}>
          새로고침
        </Button>

        {canAutoRefresh && (
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ 자동새로고침 끄기' : '▶ 자동새로고침 켜기'}
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          총 {orders.length}건
          {autoRefresh && isSeller && (
            <span className="ml-2 text-green-600 animate-pulse">● 실시간</span>
          )}
        </span>
      </div>

      {/* 주문 목록 테이블 */}
      <div className="rounded-lg border bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left whitespace-nowrap">거래일자</th>
              <th className="p-2 text-left whitespace-nowrap">
                {isSeller ? '거래처' : '판매회사'}
              </th>
              <th className="p-2 text-center whitespace-nowrap">구분</th>
              <th className="p-2 text-right whitespace-nowrap">품목</th>
              <th className="p-2 text-right whitespace-nowrap">금액</th>
              <th className="p-2 text-right whitespace-nowrap">부가세</th>
              <th className="p-2 text-right whitespace-nowrap">합계</th>
              <th className="p-2 text-center whitespace-nowrap">상태</th>
              {isSeller && <th className="p-2 text-center whitespace-nowrap">결제</th>}
              <th className="p-2 text-left whitespace-nowrap">비고</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={`${order.order_id}-${order.seller_id}`}
                  className={`border-b cursor-pointer hover:opacity-80 transition-opacity ${getRowColor(order.status, order.ready_made)} ${
                    selectedOrder?.order_id === order.order_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="p-2 whitespace-nowrap">{order.order_date}</td>
                  <td className="p-2 whitespace-nowrap">
                    {isSeller
                      ? order.customer_name || order.customer_id
                      : order.seller_name || order.seller_id
                    }
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className="text-xs">
                      {order.ready_made}
                    </Badge>
                  </td>
                  <td className="p-2 text-right">{order.item_count}</td>
                  <td className="p-2 text-right">{formatAmount(order.sum_amount)}</td>
                  <td className="p-2 text-right">{formatAmount(order.vat)}</td>
                  <td className="p-2 text-right font-medium">{formatAmount(order.total_amount)}</td>
                  <td className="p-2 text-center">
                    <Badge className="text-xs">{order.status}</Badge>
                  </td>
                  {isSeller && (
                    <td className="p-2 text-center text-xs">{order.payment_method}</td>
                  )}
                  <td className="p-2 text-xs text-muted-foreground truncate max-w-[120px]">
                    {order.comment}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 주문 상세 패널 */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChanged={fetchOrders}
        />
      )}
    </div>
  )
}
