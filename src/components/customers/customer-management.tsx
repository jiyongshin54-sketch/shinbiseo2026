'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PRICE_GRADES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

interface TradingStubSummary {
  ts_id: string
  issue_date: string
  customer_id: string
  customer_name: string
  item_count: number
  sum_amount: number
  sum_vat: number
  total_amount: number
  payment_method: string
}

interface Receivable {
  customer_id: string
  customer_name: string
  payment: string
  total: number
  this_month: number
  last_month: number
}

export function CustomerManagement() {
  const { user, canViewCustomers } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('전체')

  // 등록/수정 다이얼로그
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)

  // 미수금 데이터
  const [receivables, setReceivables] = useState<Receivable[]>([])

  // 거래 내역 (명세표)
  const [selectedCustomerForStubs, setSelectedCustomerForStubs] = useState<Customer | null>(null)
  const [tradingStubs, setTradingStubs] = useState<TradingStubSummary[]>([])
  const [stubsLoading, setStubsLoading] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: user.companyId })
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setCustomers(data)
    } finally {
      setLoading(false)
    }
  }, [user, search])

  const fetchReceivables = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/billing?seller_id=${user.companyId}`)
      const data = await res.json()
      if (Array.isArray(data)) setReceivables(data)
    } catch (e) {
      console.error('미수금 조회 실패:', e)
    }
  }, [user])

  const fetchTradingStubs = async (customer: Customer) => {
    if (!user) return
    setSelectedCustomerForStubs(customer)
    setStubsLoading(true)
    try {
      const params = new URLSearchParams({
        seller_id: user.companyId,
        customer_id: customer.customer_id,
      })
      const res = await fetch(`/api/trading-stubs?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setTradingStubs(data)
    } catch (e) {
      console.error('거래 내역 조회 실패:', e)
    } finally {
      setStubsLoading(false)
    }
  }

  useEffect(() => {
    if (canViewCustomers) {
      fetchCustomers()
      fetchReceivables()
    }
  }, [canViewCustomers, fetchCustomers, fetchReceivables])

  const openNewDialog = () => {
    setEditingCustomer(null)
    setFormData({ level1: '4.0급', level2: '4.0급', level3: '', payment: '일결제', issue_vat: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({ ...customer })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast.error('고객명은 필수입니다.')
      return
    }
    if (!formData.level1 || !formData.level2) {
      toast.error('일반가 등급과 마대가 등급은 필수입니다.')
      return
    }
    setSaving(true)
    try {
      if (editingCustomer) {
        const res = await fetch(
          `/api/customers/${editingCustomer.seller_id}/${editingCustomer.customer_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        )
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        toast.success('수정 완료')
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seller_id: user!.companyId,
            ...formData,
            register_id: user!.userId,
          }),
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        toast.success('등록 완료')
      }
      setDialogOpen(false)
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`"${customer.customer_name}" 고객을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(
        `/api/customers/${customer.seller_id}/${customer.customer_id}`,
        { method: 'DELETE' }
      )
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('삭제 완료')
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!user || !canViewCustomers) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          거래처는 대표와 관리자만 볼 수 있습니다.
        </CardContent>
      </Card>
    )
  }

  // 결제방식 필터 적용
  const filteredCustomers = paymentFilter === '전체'
    ? customers
    : customers.filter(c => c.payment === paymentFilter)

  // 미수금 분류
  const dailyReceivables = receivables.filter(r => r.payment === '일결제')
  const monthlyReceivables = receivables.filter(r => r.payment === '월결제')

  return (
    <>
      {/* 상단: 거래처 관리 + 거래처 상세/등록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2" style={{ height: 'calc(100vh - 160px)' }}>
        {/* ===== 왼쪽: 거래처 관리 ===== */}
        <Card className="flex flex-col overflow-hidden">
          <CardContent className="space-y-2 pt-0 px-2 flex flex-col flex-1 min-h-0">
            {/* 검색 바 - 한 줄 */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-base font-bold whitespace-nowrap mr-6">거래처 관리</span>
              <Label className="text-xs whitespace-nowrap">거래처명</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="고객명 또는 사업자번호"
                onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                className="w-[200px] h-8"
              />
              <Label className="text-xs whitespace-nowrap ml-2">결제방식</Label>
              <Select value={paymentFilter} onValueChange={(v) => v && setPaymentFilter(v)}>
                <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="일결제">일결제</SelectItem>
                  <SelectItem value="월결제">월결제</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8" onClick={fetchCustomers}>찾기</Button>
              <Button size="sm" className="h-8 ml-auto" onClick={openNewDialog}>+ 거래처 추가</Button>
            </div>

            {/* 거래처 목록 - 남은 공간 채움 */}
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="border-b bg-gray-50">
                    <th className="px-2 py-1.5 text-center w-[40px]">순번</th>
                    <th className="px-2 py-1.5 text-left">상호</th>
                    <th className="px-2 py-1.5 text-left">사업자번호</th>
                    <th className="px-2 py-1.5 text-left">대표</th>
                    <th className="px-2 py-1.5 text-center">결제</th>
                    <th className="px-2 py-1.5 text-center w-[80px]">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-2 text-center">로딩 중...</td></tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan={6} className="p-2 text-center text-muted-foreground">거래처가 없습니다.</td></tr>
                  ) : (
                    filteredCustomers.map((c, idx) => (
                      <tr key={`${c.seller_id}-${c.customer_id}`} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1 text-center text-xs">{idx + 1}</td>
                        <td className="px-2 py-1 font-medium">{c.customer_name}</td>
                        <td className="px-2 py-1 text-xs">{c.business_id}</td>
                        <td className="px-2 py-1">{c.owner_name}</td>
                        <td className="px-2 py-1 text-center text-xs">{c.payment || '-'}</td>
                        <td className="px-2 py-1 text-center space-x-1">
                          <button className="text-xs text-blue-600 underline hover:text-blue-800" onClick={() => openEditDialog(c)}>관리</button>
                          <button className="text-xs text-blue-600 underline hover:text-blue-800" onClick={() => fetchTradingStubs(c)}>거래</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ===== 오른쪽: 거래처별 미수금 관리 ===== */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-1 pt-0 px-2 shrink-0">
            <CardTitle className="text-base">거래처별 미수금 관리</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2 flex flex-col flex-1 min-h-0 gap-2">
            {/* 일결제 거래처 미수금 현황 */}
            <div className="flex flex-col min-h-0" style={{ flex: '2 1 0%' }}>
              <h4 className="text-sm font-bold text-center mb-1 text-blue-700 shrink-0">일결제 거래처 미수금 현황</h4>
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="border-b bg-gray-50">
                      <th className="p-1 text-center w-[28px]">순번</th>
                      <th className="p-1 text-left">거래처이름</th>
                      <th className="p-1 text-right">미수금-전체</th>
                      <th className="p-1 text-right">미수금-이번달</th>
                      <th className="p-1 text-right">미수금-지난달</th>
                      <th className="p-1 text-center">이번달 청구서</th>
                      <th className="p-1 text-center">지난달 청구서</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReceivables.length === 0 ? (
                      <tr><td colSpan={7} className="p-2 text-center text-muted-foreground">데이터 없음</td></tr>
                    ) : (
                      dailyReceivables.map((r, idx) => (
                        <tr key={r.customer_id} className="border-b hover:bg-gray-50">
                          <td className="p-1 text-center">{idx + 1}</td>
                          <td className="p-1">{r.customer_name}</td>
                          <td className="p-1 text-right font-medium">{r.total.toLocaleString()}</td>
                          <td className="p-1 text-right">{r.this_month.toLocaleString()}</td>
                          <td className="p-1 text-right">{r.last_month.toLocaleString()}</td>
                          <td className="p-1 text-center"><button className="text-xs text-blue-600 underline hover:text-blue-800">이번달 청구서</button></td>
                          <td className="p-1 text-center"><button className="text-xs text-blue-600 underline hover:text-blue-800">지난달 청구서</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 월결제 거래처 미수금 현황 */}
            <div className="flex flex-col min-h-0" style={{ flex: '3 1 0%' }}>
              <h4 className="text-sm font-bold text-center mb-1 text-blue-700 shrink-0">월결제 거래처 미수금 현황</h4>
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="border-b bg-gray-50">
                      <th className="p-1 text-center w-[28px]">순번</th>
                      <th className="p-1 text-left">거래처이름</th>
                      <th className="p-1 text-right">미수금-전체</th>
                      <th className="p-1 text-right">미수금-이번달</th>
                      <th className="p-1 text-right">미수금-지난달</th>
                      <th className="p-1 text-center">이번달 청구서</th>
                      <th className="p-1 text-center">지난달 청구서</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReceivables.length === 0 ? (
                      <tr><td colSpan={7} className="p-2 text-center text-muted-foreground">데이터 없음</td></tr>
                    ) : (
                      monthlyReceivables.map((r, idx) => (
                        <tr key={r.customer_id} className="border-b hover:bg-gray-50">
                          <td className="p-1 text-center">{idx + 1}</td>
                          <td className="p-1">{r.customer_name}</td>
                          <td className="p-1 text-right font-medium">{r.total.toLocaleString()}</td>
                          <td className="p-1 text-right">{r.this_month.toLocaleString()}</td>
                          <td className="p-1 text-right">{r.last_month.toLocaleString()}</td>
                          <td className="p-1 text-center"><button className="text-xs text-blue-600 underline hover:text-blue-800">이번달 청구서</button></td>
                          <td className="p-1 text-center"><button className="text-xs text-blue-600 underline hover:text-blue-800">지난달 청구서</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 거래처 등록/수정 모달 ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-none w-[66vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* 헤더 */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)', padding: '12px 20px' }}>
            <DialogHeader>
              <DialogTitle className="text-white text-base font-bold">
                {editingCustomer ? '거래처 상세조회/수정' : '신규 거래처 등록'}
              </DialogTitle>
              {editingCustomer && (
                <p className="text-blue-200 text-xs mt-1">ID: {editingCustomer.customer_id} | {formData.customer_name}</p>
              )}
            </DialogHeader>
          </div>

          <div className="p-4 space-y-3">
            {/* 기본 정보 섹션 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: '3px', height: '14px', backgroundColor: '#2563eb' }} />
                <span className="text-sm font-bold text-gray-700">기본 정보</span>
              </div>
              <div className="grid grid-cols-5 gap-x-3 gap-y-2 pl-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">거래처ID</Label>
                  <Input value={editingCustomer?.customer_id || '(자동생성)'} disabled className="bg-gray-50 text-gray-600 h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">*상호</Label>
                  <Input value={formData.customer_name || ''} onChange={(e) => updateForm('customer_name', e.target.value)} className="h-7 text-xs border-blue-200 focus:border-blue-500" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">사업자번호</Label>
                  <Input value={formData.business_id || ''} onChange={(e) => updateForm('business_id', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">*대표</Label>
                  <Input value={formData.owner_name || ''} onChange={(e) => updateForm('owner_name', e.target.value)} className="h-7 text-xs border-blue-200 focus:border-blue-500" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">전화번호</Label>
                  <Input value={formData.phone_number || ''} onChange={(e) => updateForm('phone_number', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">팩스번호</Label>
                  <Input value={formData.fax_number || ''} onChange={(e) => updateForm('fax_number', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">*담당자</Label>
                  <Input value={formData.contact_name || ''} onChange={(e) => updateForm('contact_name', e.target.value)} className="h-7 text-xs border-blue-200 focus:border-blue-500" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">업태</Label>
                  <Input value={formData.uptae || ''} onChange={(e) => updateForm('uptae', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">종목</Label>
                  <Input value={formData.jongmok || ''} onChange={(e) => updateForm('jongmok', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">이메일</Label>
                  <Input value={formData.email_address || ''} onChange={(e) => updateForm('email_address', e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
            </div>

            {/* 연락처 / 기타 섹션 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: '3px', height: '14px', backgroundColor: '#10b981' }} />
                <span className="text-sm font-bold text-gray-700">연락처 / 기타</span>
              </div>
              <div className="grid grid-cols-5 gap-x-3 gap-y-2 pl-3">
                <div className="space-y-0.5 col-span-3">
                  <Label className="text-xs text-gray-500">주소</Label>
                  <Input value={formData.address || ''} onChange={(e) => updateForm('address', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">홈페이지</Label>
                  <Input value={formData.homepage || ''} onChange={(e) => updateForm('homepage', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">비고</Label>
                  <Input value={formData.comment || ''} onChange={(e) => updateForm('comment', e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
            </div>

            {/* 등급 / 결제 섹션 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: '3px', height: '14px', backgroundColor: '#f59e0b' }} />
                <span className="text-sm font-bold text-gray-700">등급 / 결제</span>
              </div>
              <div className="grid grid-cols-5 gap-x-3 gap-y-2 pl-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">일반등급 *</Label>
                  <Select value={formData.level1 || '4.0급'} onValueChange={(v) => v && updateForm('level1', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">마대등급 *</Label>
                  <Select value={formData.level2 || '4.0급'} onValueChange={(v) => v && updateForm('level2', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">온라인 (CompanyID)</Label>
                  <Input value={editingCustomer?.company_id || ''} disabled className="h-7 text-xs bg-gray-50 text-gray-600" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">결제방식</Label>
                  <Select value={formData.payment || ''} onValueChange={(v) => v && updateForm('payment', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="일결제">일결제</SelectItem>
                      <SelectItem value="월결제">월결제</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">세금계산서</Label>
                  <Select value={formData.issue_vat || ''} onValueChange={(v) => v && updateForm('issue_vat', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="발행">발행</SelectItem>
                      <SelectItem value="미발행">미발행</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-t">
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700" onClick={() => {
              setFormData({ level1: '4.0급', level2: '4.0급', level3: '', payment: '일결제', issue_vat: '' })
            }}>초기화</Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? '저장 중...' : editingCustomer ? '수정' : '등록'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== 거래 내역 모달 ===== */}
      <Dialog open={!!selectedCustomerForStubs} onOpenChange={(open) => { if (!open) { setSelectedCustomerForStubs(null); setTradingStubs([]) } }}>
        <DialogContent className="!max-w-[900px] w-[80vw] max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* 상단 바 */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ backgroundColor: '#2d2d3d' }}>
            <span className="text-white font-bold text-sm">
              {selectedCustomerForStubs?.customer_name} 거래 내역
            </span>
            <button
              className="text-white text-xl font-bold px-2 hover:text-gray-300"
              onClick={() => { setSelectedCustomerForStubs(null); setTradingStubs([]) }}
            >
              &times;
            </button>
          </div>

          {/* 거래 내역 테이블 */}
          <div className="flex-1 overflow-auto p-3 min-h-0">
            {stubsLoading ? (
              <div className="flex items-center justify-center p-8 text-gray-400">로딩 중...</div>
            ) : (
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse', border: '1px solid #9f9' }}>
                <thead className="sticky top-0" style={{ backgroundColor: '#dfd' }}>
                  <tr>
                    <th className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>발행 일자</th>
                    <th className="p-1.5 text-left border" style={{ borderColor: '#9f9' }}>구매회사</th>
                    <th className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>항목수</th>
                    <th className="p-1.5 text-right border" style={{ borderColor: '#9f9' }}>공급가액</th>
                    <th className="p-1.5 text-right border" style={{ borderColor: '#9f9' }}>부가세</th>
                    <th className="p-1.5 text-right border" style={{ borderColor: '#9f9' }}>합계금액</th>
                    <th className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>지불방식</th>
                    <th className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingStubs.length === 0 ? (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">거래 내역이 없습니다.</td></tr>
                  ) : (
                    tradingStubs.map((s) => (
                      <tr key={s.ts_id} className="hover:bg-green-50">
                        <td className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>{s.issue_date?.replace(/-/g, '.')}</td>
                        <td className="p-1.5 border" style={{ borderColor: '#9f9' }}>{s.customer_name}</td>
                        <td className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>{s.item_count || '-'}</td>
                        <td className="p-1.5 text-right border" style={{ borderColor: '#9f9' }}>{Number(s.sum_amount || 0).toLocaleString()}</td>
                        <td className="p-1.5 text-right border" style={{ borderColor: '#9f9' }}>{Number(s.sum_vat || 0).toLocaleString()}</td>
                        <td className="p-1.5 text-right font-medium border" style={{ borderColor: '#9f9' }}>{Number(s.total_amount || 0).toLocaleString()}</td>
                        <td className="p-1.5 text-center border" style={{ borderColor: '#9f9' }}>{s.payment_method || ''}</td>
                        <td className="p-1.5 text-center border space-x-1" style={{ borderColor: '#9f9' }}>
                          <button className="text-xs text-purple-600 underline hover:text-purple-800">수정</button>
                          <button className="text-xs text-purple-600 underline hover:text-purple-800">출력</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
