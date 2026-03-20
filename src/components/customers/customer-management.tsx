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

export function CustomerManagement() {
  const { user, canViewCustomers } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 등록/수정 다이얼로그
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    if (canViewCustomers) fetchCustomers()
  }, [canViewCustomers, fetchCustomers])

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
        // 수정
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
        // 등록
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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">거래처 관리</CardTitle>
            <Button size="sm" onClick={openNewDialog}>+ 새 거래처</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 */}
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="고객명 또는 사업자번호"
              onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={fetchCustomers}>검색</Button>
          </div>

          {/* 고객 목록 */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2 text-left">고객명</th>
                  <th className="p-2 text-left">사업자번호</th>
                  <th className="p-2 text-left">대표자</th>
                  <th className="p-2 text-left">전화번호</th>
                  <th className="p-2 text-center">일반등급</th>
                  <th className="p-2 text-center">마대등급</th>
                  <th className="p-2 text-center">결제</th>
                  <th className="p-2 text-center w-[120px]">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-4 text-center">로딩 중...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">거래처가 없습니다.</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={`${c.seller_id}-${c.customer_id}`} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{c.customer_name}</td>
                      <td className="p-2 text-xs">{c.business_id}</td>
                      <td className="p-2">{c.owner_name}</td>
                      <td className="p-2 text-xs">{c.phone_number}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-xs">{c.level1 || '-'}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="secondary" className="text-xs">{c.level2 || '-'}</Badge>
                      </td>
                      <td className="p-2 text-center text-xs">{c.payment}</td>
                      <td className="p-2 text-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditDialog(c)}>
                          수정
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDelete(c)}>
                          삭제
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '거래처 수정' : '새 거래처 등록'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">고객명 *</Label>
                <Input value={formData.customer_name || ''} onChange={(e) => updateForm('customer_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">사업자번호</Label>
                <Input value={formData.business_id || ''} onChange={(e) => updateForm('business_id', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">대표자명</Label>
                <Input value={formData.owner_name || ''} onChange={(e) => updateForm('owner_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">담당자명</Label>
                <Input value={formData.contact_name || ''} onChange={(e) => updateForm('contact_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">전화번호</Label>
                <Input value={formData.phone_number || ''} onChange={(e) => updateForm('phone_number', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">팩스</Label>
                <Input value={formData.fax_number || ''} onChange={(e) => updateForm('fax_number', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">이메일</Label>
                <Input value={formData.email_address || ''} onChange={(e) => updateForm('email_address', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">업태</Label>
                <Input value={formData.uptae || ''} onChange={(e) => updateForm('uptae', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">주소</Label>
              <Input value={formData.address || ''} onChange={(e) => updateForm('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">일반가 등급 *</Label>
                <Select value={formData.level1 || '4.0급'} onValueChange={(v) => v && updateForm('level1', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">마대가 등급 *</Label>
                <Select value={formData.level2 || '4.0급'} onValueChange={(v) => v && updateForm('level2', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">결제조건</Label>
                <Select value={formData.payment || ''} onValueChange={(v) => v && updateForm('payment', v)}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일결제">일결제</SelectItem>
                    <SelectItem value="월결제">월결제</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">비고</Label>
              <Input value={formData.comment || ''} onChange={(e) => updateForm('comment', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : editingCustomer ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
