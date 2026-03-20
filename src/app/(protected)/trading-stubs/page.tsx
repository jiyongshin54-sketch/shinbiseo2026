'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TradingStubMaster, TradingStubDetail, Customer } from '@/lib/types'
import { toast } from 'sonner'

interface CartItem {
  category_id: string
  description: string
  standard: string
  unit_price: number
  quantity: number
  amount: number
  vat: number
}

export default function TradingStubsPage() {
  const { user } = useAuth()
  const [stubs, setStubs] = useState<(TradingStubMaster & { customers?: { customer_name: string } })[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  // 검색 필터
  const now = new Date()
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.01`
  })
  const [dateTo, setDateTo] = useState(() =>
    `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  )
  const [searchCustomerId, setSearchCustomerId] = useState('')

  // 우측: 등록/수정 폼
  const [editingTsId, setEditingTsId] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(() =>
    `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  )
  const [formCustomerId, setFormCustomerId] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  // 상세 입력
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [inputCategoryId, setInputCategoryId] = useState('')
  const [inputDescription, setInputDescription] = useState('')
  const [inputStandard, setInputStandard] = useState('')
  const [inputUnitPrice, setInputUnitPrice] = useState('')
  const [inputQuantity, setInputQuantity] = useState('')

  // 거래처 로드
  useEffect(() => {
    if (!user) return
    fetch(`/api/customers?seller_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCustomers(data) })
  }, [user])

  // 목록 조회
  const fetchStubs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: user.companyId, date_from: dateFrom, date_to: dateTo })
      if (searchCustomerId) params.set('customer_id', searchCustomerId)
      const res = await fetch(`/api/trading-stubs?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setStubs(data)
    } finally {
      setLoading(false)
    }
  }, [user, dateFrom, dateTo, searchCustomerId])

  useEffect(() => { fetchStubs() }, [fetchStubs])

  // 수정 로드
  const loadStubForEdit = async (stub: TradingStubMaster) => {
    setEditingTsId(stub.ts_id)
    setIssueDate(stub.issue_date || '')
    setFormCustomerId(stub.customer_id || '')
    setPaymentMethod(stub.payment_method || '')
    setComment(stub.comment || '')

    const res = await fetch(`/api/trading-stubs/${stub.ts_id}/details`)
    const details: TradingStubDetail[] = await res.json()
    setCartItems(details.map(d => ({
      category_id: d.category_id || '',
      description: d.description || '',
      standard: d.standard || '',
      unit_price: Number(d.unit_price) || 0,
      quantity: Number(d.quantity) || 0,
      amount: Number(d.amount) || 0,
      vat: Number(d.vat) || 0,
    })))
    clearInput()
  }

  // 신규
  const resetForm = () => {
    setEditingTsId(null)
    setIssueDate(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`)
    setFormCustomerId('')
    setCartItems([])
    setPaymentMethod('')
    setComment('')
    clearInput()
  }

  const clearInput = () => {
    setEditIdx(null)
    setInputCategoryId('')
    setInputDescription('')
    setInputStandard('')
    setInputUnitPrice('')
    setInputQuantity('')
  }

  // 품목 추가/수정
  const addOrUpdateItem = () => {
    const price = parseInt(inputUnitPrice) || 0
    const qty = parseInt(inputQuantity) || 0
    if (!inputDescription) { toast.error('품명을 입력하세요.'); return }
    if (qty === 0) { toast.error('수량을 입력하세요.'); return }
    const amount = price * qty
    const vat = Math.round(amount / 10)
    const item: CartItem = {
      category_id: inputCategoryId,
      description: inputDescription,
      standard: inputStandard,
      unit_price: price,
      quantity: qty,
      amount,
      vat,
    }
    if (editIdx !== null) {
      setCartItems(prev => prev.map((it, i) => i === editIdx ? item : it))
    } else {
      setCartItems(prev => [...prev, item])
    }
    clearInput()
  }

  const editItem = (idx: number) => {
    const item = cartItems[idx]
    setEditIdx(idx)
    setInputCategoryId(item.category_id)
    setInputDescription(item.description)
    setInputStandard(item.standard)
    setInputUnitPrice(String(item.unit_price))
    setInputQuantity(String(item.quantity))
  }

  const removeItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx))
    if (editIdx === idx) clearInput()
  }

  // 합계
  const sumAmount = cartItems.reduce((s, i) => s + i.amount, 0)
  const sumVat = cartItems.reduce((s, i) => s + i.vat, 0)
  const totalAmount = sumAmount + sumVat

  // 저장
  const handleSave = async () => {
    if (!user) return
    if (!formCustomerId) { toast.error('거래처를 선택하세요.'); return }
    if (cartItems.length === 0) { toast.error('품목을 추가하세요.'); return }

    setSaving(true)
    try {
      const payload = {
        seller_id: user.companyId,
        customer_id: formCustomerId,
        issue_date: issueDate,
        sum_amount: sumAmount,
        sum_vat: sumVat,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        comment,
        items: cartItems.map(i => ({
          category_id: i.category_id,
          description: i.description,
          standard: i.standard,
          unit_price: i.unit_price,
          quantity: i.quantity,
          amount: i.amount,
          vat: i.vat,
        })),
      }

      let res: Response
      if (editingTsId) {
        res = await fetch(`/api/trading-stubs/${editingTsId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/trading-stubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const result = await res.json()
      if (result.error) throw new Error(result.error)

      toast.success(editingTsId ? '수정 완료' : '등록 완료')
      resetForm()
      fetchStubs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 인쇄 (새 창)
  const openPrint = (tsId: string) => {
    window.open(`/trading-stub-print?ts_id=${tsId}`, '_blank', 'width=900,height=700')
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
      {/* 좌측: 목록 (50%) */}
      <div style={{ width: '50%' }}>
        {/* 검색 */}
        <div style={{ backgroundColor: 'silver', padding: '5px 8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>거래처:</span>
            <select
              value={searchCustomerId}
              onChange={(e) => setSearchCustomerId(e.target.value)}
              style={{ padding: '2px', fontSize: '12px' }}
            >
              <option value="">전체</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
              ))}
            </select>
            <span>기준일자:</span>
            <input value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '90px', padding: '2px', fontSize: '12px' }} />
            <span>~</span>
            <input value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '90px', padding: '2px', fontSize: '12px' }} />
            <button onClick={fetchStubs} style={{ padding: '2px 12px', fontWeight: 'bold', cursor: 'pointer' }}>검색</button>
          </div>
        </div>

        {/* 목록 테이블 */}
        <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid silver' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#ccffcc' }}>
                <th style={thStyle}>발행일자</th>
                <th style={thStyle}>구매회사</th>
                <th style={thStyle}>항목수</th>
                <th style={thStyle}>공급가액</th>
                <th style={thStyle}>부가세</th>
                <th style={thStyle}>합계</th>
                <th style={thStyle}>지불</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>조회 중...</td></tr>
              ) : stubs.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>거래명세표가 없습니다.</td></tr>
              ) : stubs.map(s => (
                <tr key={s.ts_id} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}
                  className="hover:bg-gray-50"
                >
                  <td style={tdStyle}>{s.issue_date}</td>
                  <td style={tdStyle}>{s.customers?.customer_name || s.customer_id}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{s.item_count}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(s.sum_amount).toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(s.sum_vat).toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{Number(s.total_amount).toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{s.payment_method || ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span onClick={() => loadStubForEdit(s)} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer', marginRight: '6px' }}>수정</span>
                    <span onClick={() => openPrint(s.ts_id)} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>출력</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '6px' }}>
          <button onClick={resetForm} style={{ padding: '4px 16px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'MintCream', border: '1px solid #999' }}>
            + 새 거래명세표
          </button>
        </div>
      </div>

      {/* 우측: 등록/수정 폼 (50%) */}
      <div style={{ width: '50%' }}>
        {/* 헤더 */}
        <div style={{ backgroundColor: 'skyblue', padding: '5px 8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>{editingTsId ? '거래명세표 수정' : '거래명세표 등록'}</span>
            <span>거래일:</span>
            <input value={issueDate} onChange={e => setIssueDate(e.target.value)} style={{ width: '90px', padding: '2px', fontSize: '12px' }} />
            <span>거래처:</span>
            <select
              value={formCustomerId}
              onChange={(e) => setFormCustomerId(e.target.value)}
              style={{ padding: '2px', fontSize: '12px' }}
            >
              <option value="">선택</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 품목 목록 */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid silver', marginBottom: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#ccffcc' }}>
                <th style={thStyle}>No.</th>
                <th style={thStyle}>품명</th>
                <th style={thStyle}>규격</th>
                <th style={thStyle}>단가</th>
                <th style={thStyle}>수량</th>
                <th style={thStyle}>공급가액</th>
                <th style={thStyle}>세액</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '10px', textAlign: 'center', color: '#999' }}>품목을 추가하세요.</td></tr>
              ) : cartItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd', backgroundColor: editIdx === idx ? '#ffffcc' : undefined }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{item.standard}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.unit_price.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.amount.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.vat.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span onClick={() => editItem(idx)} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer', marginRight: '4px' }}>수정</span>
                    <span onClick={() => removeItem(idx)} style={{ color: 'red', textDecoration: 'underline', cursor: 'pointer' }}>빼기</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 상세 입력 폼 */}
        <div style={{ backgroundColor: 'blanchedalmond', border: '2px solid darkorange', padding: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666' }}>순번</div>
              <input value={editIdx !== null ? editIdx + 1 : cartItems.length + 1} readOnly style={{ width: '40px', padding: '2px', fontSize: '12px', backgroundColor: '#eee' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666' }}>품명 *</div>
              <input value={inputDescription} onChange={e => setInputDescription(e.target.value)} style={{ width: '120px', padding: '2px', fontSize: '12px' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666' }}>규격</div>
              <input value={inputStandard} onChange={e => setInputStandard(e.target.value)} style={{ width: '100px', padding: '2px', fontSize: '12px' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666' }}>단가</div>
              <input type="number" value={inputUnitPrice} onChange={e => setInputUnitPrice(e.target.value)} style={{ width: '80px', padding: '2px', fontSize: '12px' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666' }}>수량</div>
              <input type="number" value={inputQuantity} onChange={e => setInputQuantity(e.target.value)} style={{ width: '60px', padding: '2px', fontSize: '12px' }} />
            </div>
            <button onClick={clearInput} style={{ padding: '2px 10px', cursor: 'pointer' }}>초기화</button>
            <button onClick={addOrUpdateItem} style={{ padding: '2px 10px', cursor: 'pointer', backgroundColor: '#90EE90', fontWeight: 'bold' }}>
              {editIdx !== null ? '수정' : '추가'}
            </button>
          </div>
        </div>

        {/* 합계 영역 */}
        <div style={{ backgroundColor: 'aliceblue', padding: '8px', border: '1px solid silver' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span>건수: <strong>{cartItems.length}</strong></span>
            <span>공급가: <strong>{sumAmount.toLocaleString()}</strong></span>
            <span>부가세: <strong>{sumVat.toLocaleString()}</strong></span>
            <span>총계: <strong style={{ fontSize: '14px' }}>{totalAmount.toLocaleString()}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>지불방식:</span>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ padding: '2px', fontSize: '12px' }}>
              <option value="">미정</option>
              <option value="현금">현금</option>
              <option value="수금">수금</option>
              <option value="카드">카드</option>
              <option value="이체">이체</option>
            </select>
            <span>비고:</span>
            <input value={comment} onChange={e => setComment(e.target.value)} style={{ width: '120px', padding: '2px', fontSize: '12px' }} />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '4px 20px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'MintCream', border: '1px solid #999' }}
            >
              {saving ? '저장 중...' : editingTsId ? '거래명세표 수정' : '거래명세표 등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '12px' }
const tdStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', fontSize: '12px' }
