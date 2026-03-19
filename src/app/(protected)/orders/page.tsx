'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { OrderDetailPanel } from '@/components/orders/order-detail-panel'
const ORDER_STATUS_LIST = ['주문', '준비됨', '수령', '완료', '취소', '견적']
import type { OrderMaster } from '@/lib/types'

const READY_MADE_OPTIONS = ['기성', '맞춤']

export default function OrdersPage() {
  const { user, isSeller } = useAuth()

  const [orders, setOrders] = useState<OrderMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderMaster | null>(null)

  const [viewMode, setViewMode] = useState('판매 내역')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [readyMadeFilter, setReadyMadeFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSeller) {
        params.set('seller_id', user.companyId)
      } else {
        params.set('buyer_id', user.companyId)
      }
      params.set('dateFrom', dateFrom.replace(/-/g, '.'))
      params.set('dateTo', dateTo.replace(/-/g, '.'))
      if (statusFilter) params.set('status', statusFilter)
      if (readyMadeFilter) params.set('ready_made', readyMadeFilter)

      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      let filtered = Array.isArray(data) ? data : (data.orders || [])
      if (customerFilter) {
        filtered = filtered.filter((o: any) =>
          o.customer_id?.includes(customerFilter) ||
          o.customer_name?.includes(customerFilter)
        )
      }
      setOrders(filtered)
    } catch (err) {
      console.error('주문 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isSeller, dateFrom, dateTo, statusFilter, readyMadeFilter, customerFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const setQuickDate = (type: string) => {
    const now = new Date()
    let from: Date, to: Date
    switch (type) {
      case '어제': from = to = new Date(now.getTime() - 86400000); break
      case '오늘': from = to = now; break
      case '지난달':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        to = new Date(now.getFullYear(), now.getMonth(), 0); break
      case '이번달':
        from = new Date(now.getFullYear(), now.getMonth(), 1); to = now; break
      default: return
    }
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to.toISOString().split('T')[0])
  }

  const getRowStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case '견적': return { backgroundColor: 'YellowGreen' }
      case '주문': return { backgroundColor: 'Yellow' }
      case '준비됨': return { backgroundColor: 'DarkOrange', color: 'white' }
      case '수령': return { backgroundColor: 'Silver' }
      case '완료': return {}
      case '취소': return { backgroundColor: 'DarkGray', color: 'white' }
      default: return {}
    }
  }

  return (
    <div>
      {/* 구 앱 주문관리 2행 필터 (silver 배경) */}
      <div style={{ backgroundColor: 'silver', padding: '5px 8px', marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <span style={{ fontSize: '13px' }}>조회구분:</span>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} style={ddlStyle}>
            <option>판매 내역</option>
            <option>구매 내역</option>
          </select>
          <span style={{ fontSize: '13px' }}>보는항목:</span>
          <select style={ddlStyle}><option>주문별</option><option>세부항목별</option></select>
          <span style={{ fontSize: '13px' }}>기준일자:</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...ddlStyle, width: '130px' }} />
          <span>~</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...ddlStyle, width: '130px' }} />
          {['어제', '오늘', '지난달', '이번달'].map(q => (
            <button key={q} onClick={() => setQuickDate(q)} style={{ color: 'blue', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>{q}</button>
          ))}
          <span style={{ fontSize: '13px' }}>거래처:</span>
          <input type="text" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ ...ddlStyle, width: '100px' }} />
          <button onClick={fetchOrders} style={{ padding: '4px 20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>검색</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px' }}>기성여부:</span>
          <select value={readyMadeFilter} onChange={(e) => setReadyMadeFilter(e.target.value)} style={ddlStyle}>
            <option value="">전체</option>
            {READY_MADE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <span style={{ fontSize: '13px' }}>결제수단:</span>
          <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} style={ddlStyle}>
            <option value="">전체</option>
            <option value="현금">현금</option><option value="수금">수금</option>
            <option value="카드">카드</option><option value="이체">이체</option>
          </select>
          <span style={{ fontSize: '13px' }}>주문상태:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={ddlStyle}>
            <option value="">전체</option>
            {ORDER_STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: '13px' }}>거래처 결제방식:</span>
          <select style={ddlStyle}>
            <option value="">전체</option>
            <option value="일결제">일결제</option><option value="월결제">월결제</option>
          </select>
        </div>
      </div>

      {/* 주문 목록 GridView */}
      <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid silver' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ccffcc' }}>
              <th style={thStyle}>주문 일자</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>{isSeller ? '구매처' : '판매처'}</th>
              <th style={thStyle}>등록자</th>
              <th style={thStyle}>기성여부</th>
              <th style={thStyle}>대표물건</th>
              <th style={thStyle}>건수</th>
              <th style={thStyle}>공급가</th>
              <th style={thStyle}>부가세</th>
              <th style={thStyle}>총계</th>
              <th style={thStyle}>지불방식</th>
              <th style={thStyle}>준비</th>
              <th style={thStyle}>수령</th>
              <th style={thStyle}>완료</th>
              <th style={thStyle}>비고</th>
              {isSeller && <th style={thStyle}>수정</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} style={{ padding: '20px', textAlign: 'center' }}>조회 중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={16} style={{ padding: '20px', textAlign: 'center' }}>조회된 주문이 없습니다.</td></tr>
            ) : orders.map((order) => (
              <tr
                key={order.order_id}
                style={{ ...getRowStyle(order.status || ''), cursor: 'pointer' }}
                className="hover:opacity-80"
                onClick={() => setSelectedOrder(order)}
              >
                <td style={tdStyle}>{order.order_date}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{order.status}</td>
                <td style={tdStyle}>{order.customer_id}</td>
                <td style={tdStyle}>{(order as any).orderer_name || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{order.ready_made}</td>
                <td style={tdStyle}>{(order as any).representative_item || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{order.item_count}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(order.sum_amount || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(order.vat || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{Number(order.total_amount || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{order.payment_method || ''}</td>
                <td style={tdStyle}>{(order as any).ready_name || ''}</td>
                <td style={tdStyle}>{(order as any).receive_name || ''}</td>
                <td style={tdStyle}>{(order as any).finish_name || ''}</td>
                <td style={{ ...tdStyle, maxWidth: '100px' }}>{order.comment || ''}</td>
                {isSeller && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ color: 'cornflowerblue', cursor: 'pointer', textDecoration: 'underline' }}>수정</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 주문 상세 */}
      {selectedOrder && (
        <div style={{ marginTop: '8px' }}>
          <OrderDetailPanel
            order={selectedOrder as any}
            onClose={() => setSelectedOrder(null)}
            onStatusChanged={fetchOrders}
          />
        </div>
      )}
    </div>
  )
}

const ddlStyle: React.CSSProperties = { padding: '2px', fontSize: '14px' }
const thStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '12px' }
const tdStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', whiteSpace: 'nowrap', fontSize: '12px' }
