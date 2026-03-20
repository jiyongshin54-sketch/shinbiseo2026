'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { OrderDetailModal } from './order-detail-modal'
import { TradingStubModal } from './trading-stub-modal'
import { AUTO_REFRESH_INTERVAL } from '@/lib/constants'
import type { DisplayBoardOrder } from '@/lib/types'
import { toast } from 'sonner'

export function DisplayBoard() {
  const { user, isSeller, isBuyer, canAutoRefresh, canViewAmountInList } = useAuth()
  const [orders, setOrders] = useState<DisplayBoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<DisplayBoardOrder | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [stubOrder, setStubOrder] = useState<DisplayBoardOrder | null>(null)
  const [stubModalOpen, setStubModalOpen] = useState(false)
  const [readyMadeFilter, setReadyMadeFilter] = useState('전체')
  const [statusFilter, setStatusFilter] = useState('모든 상태')
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
    if (statusFilter !== '모든 상태') {
      const statusMap: Record<string, string> = {
        '견적 상태': '견적',
        '주문 상태': '주문',
        '준비됨 상태': '준비됨',
        '수령 상태': '수령',
        '완료 상태': '완료',
        '취소 상태': '취소',
      }
      if (statusMap[statusFilter]) {
        params.set('status', statusMap[statusFilter])
      }
    }

    try {
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()

      if (Array.isArray(data)) {
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
  }, [user, isSeller, readyMadeFilter, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!autoRefresh || !canAutoRefresh) return
    const interval = setInterval(fetchOrders, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefresh, canAutoRefresh, fetchOrders])

  // 구 앱 색상 코딩 (YellowGreen, Yellow, LightSkyBlue, DarkOrange, DeepPink, Silver, DarkGray)
  const getRowStyle = (status: string | null, readyMade: string | null): React.CSSProperties => {
    if (!status) return {}
    if (status.includes('견적')) return { backgroundColor: 'YellowGreen' }
    if (status === '주문' && readyMade === '기성') return { backgroundColor: 'Yellow' }
    if (status === '주문' && readyMade === '맞춤') return { backgroundColor: 'LightSkyBlue' }
    if (status.includes('준비됨') && readyMade === '기성') return { backgroundColor: 'DarkOrange', color: 'white' }
    if (status.includes('준비됨') && readyMade === '맞춤') return { backgroundColor: 'DeepPink', color: 'white' }
    if (status === '수령') return { backgroundColor: 'Silver' }
    if (status === '완료') return { backgroundColor: 'White' }
    if (status === '취소') return { backgroundColor: 'DarkGray', color: 'white' }
    return {}
  }

  const formatAmount = (amount: number | null): string => {
    if (amount == null) return ''
    if (!canViewAmountInList) return '*****'
    return Number(amount).toLocaleString()
  }

  // ISO datetime → "MM.DD HH:MM" 짧은 형식
  const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr) return ''
    try {
      const d = new Date(timeStr)
      if (isNaN(d.getTime())) return ''
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${mm}.${dd} ${hh}:${mi}`
    } catch {
      return ''
    }
  }

  if (!user) return null

  return (
    <div>
      {/* 필터 바 - 구 앱 스타일 */}
      <div className="flex items-center justify-end gap-2 mb-1 flex-wrap">
        {canAutoRefresh && (
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: autoRefresh ? '#f0f0f0' : '#ddd',
              border: '1px solid silver',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {autoRefresh ? '자동Refresh 중지' : '자동Refresh 시작'}
          </button>
        )}
        <select
          value={readyMadeFilter}
          onChange={(e) => setReadyMadeFilter(e.target.value)}
          style={{ padding: '2px', fontSize: '14px' }}
        >
          <option value="전체">전체</option>
          <option value="기성">기성</option>
          <option value="맞춤">맞춤</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '2px', fontSize: '14px' }}
        >
          <option value="모든 상태">모든 상태</option>
          <option value="견적 상태">견적 상태</option>
          <option value="주문 상태">주문 상태</option>
          <option value="준비됨 상태">준비됨 상태</option>
          <option value="수령 상태">수령 상태</option>
          <option value="완료 상태">완료 상태</option>
          <option value="취소 상태">취소 상태</option>
        </select>
      </div>

      {/* 전광판 테이블 - 구 앱 GridView 스타일 */}
      <div style={{ maxHeight: '410px', overflowY: 'auto', border: '1px solid silver' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ccffcc' }}>
              <th style={thStyle}>주문 일자</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>판매사</th>
              <th style={thStyle}>구매사</th>
              <th style={thStyle}>대표물건</th>
              <th style={thStyle}>주문자</th>
              <th style={thStyle}>구분</th>
              <th style={thStyle}>건수</th>
              <th style={thStyle}>공급가</th>
              <th style={thStyle}>처리 일시</th>
              <th style={thStyle}>보기</th>
              {isSeller && <th style={thStyle}>명세표</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: '20px', textAlign: 'center' }}>주문이 없습니다.</td></tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={`${order.order_id}-${order.seller_id}`}
                  style={{
                    ...getRowStyle(order.status, order.ready_made),
                    cursor: 'pointer',
                    ...(selectedOrder?.order_id === order.order_id
                      ? { outline: '2px solid blue' }
                      : {}),
                  }}
                  className="hover:opacity-80"
                  onClick={() => { setSelectedOrder(order); setModalOpen(true) }}
                >
                  <td style={tdStyle}>{order.order_date}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{order.status}</td>
                  <td style={tdStyle}>{order.seller_name || order.seller_id}</td>
                  <td style={tdStyle}>{order.customer_name || order.customer_id}</td>
                  <td style={tdStyle}>
                    {order.representative_item || ''}
                  </td>
                  <td style={tdStyle}>{order.orderer_name || ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{order.ready_made}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{order.item_count}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{formatAmount(order.sum_amount)}</td>
                  <td style={{ ...tdStyle, fontSize: '11px' }}>
                    {formatTime(order.finish_time || order.receive_time || order.ready_time || order.order_time)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      style={{ color: 'cornflowerblue', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrder(order)
                        setModalOpen(true)
                      }}
                    >
                      보기
                    </span>
                  </td>
                  {isSeller && (
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        style={{ color: 'cornflowerblue', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setStubOrder(order)
                          setStubModalOpen(true)
                        }}
                      >
                        명세표
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 주문 상세 모달 */}
      <OrderDetailModal
        order={selectedOrder}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedOrder(null) }}
        onStatusChanged={fetchOrders}
      />

      {/* 거래명세표 모달 */}
      <TradingStubModal
        order={stubOrder}
        open={stubModalOpen}
        onClose={() => { setStubModalOpen(false); setStubOrder(null) }}
      />
    </div>
  )
}

// 구 앱 GridView 스타일 (th/td: padding:3px, border:1px solid silver)
const thStyle: React.CSSProperties = {
  padding: '3px 5px',
  border: '1px solid silver',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontWeight: 'bold',
  fontSize: '12px',
}

const tdStyle: React.CSSProperties = {
  padding: '3px 5px',
  border: '1px solid silver',
  whiteSpace: 'nowrap',
  fontSize: '12px',
}
