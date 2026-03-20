'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { OrderDetailPanel } from '@/components/orders/order-detail-panel'
import { toast } from 'sonner'
const ORDER_STATUS_LIST = ['전체', '집계', '결산', '주문', '준비됨', '수령', '완료', '취소', '견적']
import type { OrderMaster } from '@/lib/types'

const READY_MADE_OPTIONS = ['기성', '맞춤']

export default function OrdersPage() {
  const { user, isSeller, isOwner } = useAuth()

  const [orders, setOrders] = useState<OrderMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderMaster | null>(null)
  const [editingOrder, setEditingOrder] = useState<OrderMaster | null>(null)

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
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('')

  const fetchOrders = useCallback(async () => {
    if (!user) return
    // 비대표는 거래처 선택 필수 (결산 상태 제외)
    if (!isOwner && statusFilter !== '결산' && !customerFilter) {
      toast.error('조회할 거래처를 선택하세요. 거래처별 조회만 가능합니다.')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      // viewMode에 따라 판매/구매 전환
      if (viewMode === '판매 내역' && isSeller) {
        params.set('seller_id', user.companyId)
      } else {
        params.set('buyer_id', user.companyId)
      }
      params.set('dateFrom', dateFrom.replace(/-/g, '.'))
      params.set('dateTo', dateTo.replace(/-/g, '.'))
      if (statusFilter) params.set('status', statusFilter)
      if (readyMadeFilter) params.set('ready_made', readyMadeFilter)
      if (paymentMethodFilter) params.set('payment_method', paymentMethodFilter)

      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      let filtered = Array.isArray(data) ? data : (data.orders || [])
      // 클라이언트사이드 필터: 거래처명
      if (customerFilter) {
        filtered = filtered.filter((o: any) =>
          o.customer_id?.includes(customerFilter) ||
          o.customer_name?.includes(customerFilter)
        )
      }
      // 클라이언트사이드 필터: 거래처 결제방식
      if (paymentTypeFilter) {
        filtered = filtered.filter((o: any) =>
          o.customer_payment === paymentTypeFilter
        )
      }
      setOrders(filtered)
    } catch (err) {
      console.error('주문 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isSeller, isOwner, viewMode, dateFrom, dateTo, statusFilter, readyMadeFilter, customerFilter, paymentMethodFilter, paymentTypeFilter])

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

  // --- 주문 수정 (인라인) ---
  const [editComment, setEditComment] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editOrderDate, setEditOrderDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const startEdit = (order: OrderMaster, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingOrder(order)
    setEditComment(order.comment || '')
    setEditPaymentMethod(order.payment_method || '')
    setEditPaymentDate(order.payment_date || '')
    setEditOrderDate(order.order_date || '')
  }

  const saveEdit = async () => {
    if (!editingOrder) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/orders/${editingOrder.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: editingOrder.seller_id,
          comment: editComment,
          payment_method: editPaymentMethod,
          payment_date: editPaymentDate,
          order_date: editOrderDate,
        }),
      })
      if (res.ok) {
        toast.success('수정 완료')
        setEditingOrder(null)
        fetchOrders()
      } else {
        const err = await res.json()
        toast.error(err.error || '수정 실패')
      }
    } catch { toast.error('수정 실패') }
    finally { setEditSaving(false) }
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
          <select value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)} style={ddlStyle}>
            <option value="">전체</option>
            <option value="일결제">일결제</option><option value="월결제">월결제</option>
          </select>
        </div>
      </div>

      {/* 주문 수정 패널 (인라인) */}
      {editingOrder && (
        <div style={{ backgroundColor: '#ffffcc', border: '2px solid orange', padding: '10px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '13px' }}>주문 수정: {editingOrder.order_id}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '12px' }}>거래일자:</span>
              <input type="text" value={editOrderDate} onChange={e => setEditOrderDate(e.target.value)} style={{ ...ddlStyle, width: '90px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '12px' }}>결제수단:</span>
              <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)} style={ddlStyle}>
                <option value="">미정</option>
                <option value="현금">현금</option><option value="수금">수금</option>
                <option value="카드">카드</option><option value="이체">이체</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '12px' }}>결제일:</span>
              <input type="text" value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} style={{ ...ddlStyle, width: '90px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '12px' }}>비고:</span>
              <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)} style={{ ...ddlStyle, width: '150px' }} />
            </div>
            <button onClick={saveEdit} disabled={editSaving} style={{ padding: '3px 15px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: 'cornflowerblue', color: 'white', border: 'none' }}>
              {editSaving ? '저장중...' : '저장'}
            </button>
            <button onClick={() => setEditingOrder(null)} style={{ padding: '3px 15px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

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
                style={{
                  ...getRowStyle(order.status || ''),
                  cursor: 'pointer',
                  outline: editingOrder?.order_id === order.order_id ? '2px solid orange' : 'none',
                }}
                className="hover:opacity-80"
                onClick={() => setSelectedOrder(order)}
              >
                <td style={tdStyle}>{order.order_date}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{order.status}</td>
                <td style={tdStyle}>{(order as any).customer_name || order.customer_id}</td>
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
                    <span
                      onClick={(e) => startEdit(order, e)}
                      style={{ color: 'cornflowerblue', cursor: 'pointer', textDecoration: 'underline' }}
                    >수정</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 주문 상세 */}
      {selectedOrder && !editingOrder && (
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
