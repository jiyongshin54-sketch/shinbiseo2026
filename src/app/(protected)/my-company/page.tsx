'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CustomerManagement } from '@/components/customers/customer-management'
import type { Company, User } from '@/lib/types'
import { toast } from 'sonner'

export default function MyCompanyPage() {
  const { user, isOwner, isSeller, canEditCompany, canManageStaff, canViewCustomers } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // 회사 정보 로드
  useEffect(() => {
    if (!user) return
    fetch(`/api/companies/${user.companyId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCompany(data)
          setCompanyForm(data)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  // 직원 목록 로드
  useEffect(() => {
    if (!user || !canManageStaff) return
    fetch(`/api/users?company_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMembers(data) })
  }, [user, canManageStaff])

  const handleSaveCompany = async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch(`/api/companies/${user.companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('회사 정보 수정 완료')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '승인', approve_id: user?.userId }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('승인 완료')
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: '승인' as const } : m))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '승인 실패')
    }
  }

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.user_id === user?.userId) {
      toast.error('자기 자신은 삭제할 수 없습니다.')
      return
    }
    if (!confirm(`"${targetUser.user_name}" 직원을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/users/${targetUser.user_id}/status`, { method: 'DELETE' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('삭제 완료')
      setMembers(prev => prev.filter(m => m.user_id !== targetUser.user_id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const handleChangePower = async (userId: string, newPower: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power: newPower }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success(`권한 변경: ${newPower}`)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, power: newPower as User['power'] } : m))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경 실패')
    }
  }

  const updateCompanyForm = (field: string, value: string) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }))
  }

  if (!user || loading) {
    return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>
  }

  const pendingMembers = members.filter(m => m.status === '신청')
  const activeMembers = members.filter(m => m.status === '승인')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">내 회사 설정</h2>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">회사 정보</TabsTrigger>
          {canManageStaff && <TabsTrigger value="members">직원 관리 {pendingMembers.length > 0 && `(${pendingMembers.length})`}</TabsTrigger>}
          {canViewCustomers && <TabsTrigger value="customers">거래처 관리</TabsTrigger>}
        </TabsList>

        {/* 회사 정보 */}
        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">회사 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">회사명</Label>
                  <Input value={companyForm.company_name || ''} onChange={(e) => updateCompanyForm('company_name', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">사업자번호</Label>
                  <Input value={companyForm.business_id || ''} onChange={(e) => updateCompanyForm('business_id', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">대표자명</Label>
                  <Input value={companyForm.owner_name || ''} onChange={(e) => updateCompanyForm('owner_name', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">전화번호</Label>
                  <Input value={companyForm.phone_number || ''} onChange={(e) => updateCompanyForm('phone_number', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">팩스</Label>
                  <Input value={companyForm.fax_number || ''} onChange={(e) => updateCompanyForm('fax_number', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">이메일</Label>
                  <Input value={companyForm.email_address || ''} onChange={(e) => updateCompanyForm('email_address', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">업태</Label>
                  <Input value={companyForm.uptae || ''} onChange={(e) => updateCompanyForm('uptae', e.target.value)} disabled={!canEditCompany} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">종목</Label>
                  <Input value={companyForm.jongmok || ''} onChange={(e) => updateCompanyForm('jongmok', e.target.value)} disabled={!canEditCompany} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">주소</Label>
                <Input value={companyForm.address || ''} onChange={(e) => updateCompanyForm('address', e.target.value)} disabled={!canEditCompany} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>구분: <Badge>{company?.power}</Badge></span>
                <span>상태: <Badge variant="outline">{company?.status}</Badge></span>
              </div>
              {canEditCompany && (
                <Button onClick={handleSaveCompany} disabled={saving}>
                  {saving ? '저장 중...' : '정보 수정'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 직원 관리 */}
        {canManageStaff && (
          <TabsContent value="members">
            <div className="space-y-4">
              {/* 승인 대기 */}
              {pendingMembers.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base text-orange-600">가입 승인 대기 ({pendingMembers.length}명)</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="p-2 text-left">이름</th>
                          <th className="p-2 text-left">이메일</th>
                          <th className="p-2 text-left">휴대폰</th>
                          <th className="p-2 text-center">신청일</th>
                          <th className="p-2 text-center">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingMembers.map(m => (
                          <tr key={m.user_id} className="border-b">
                            <td className="p-2 font-medium">{m.user_name}</td>
                            <td className="p-2 text-xs">{m.email_address}</td>
                            <td className="p-2 text-xs">{m.mobile_number}</td>
                            <td className="p-2 text-center text-xs">{m.request_time ? new Date(m.request_time).toLocaleDateString() : ''}</td>
                            <td className="p-2 text-center space-x-1">
                              <Button size="sm" className="h-7 text-xs" onClick={() => handleApproveUser(m.user_id)}>승인</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDeleteUser(m)}>거절</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* 현재 직원 */}
              <Card>
                <CardHeader><CardTitle className="text-base">직원 목록 ({activeMembers.length}명)</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="p-2 text-left">이름</th>
                        <th className="p-2 text-left">이메일</th>
                        <th className="p-2 text-left">휴대폰</th>
                        <th className="p-2 text-center">권한</th>
                        <th className="p-2 text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMembers.map(m => (
                        <tr key={m.user_id} className="border-b">
                          <td className="p-2 font-medium">{m.user_name}</td>
                          <td className="p-2 text-xs">{m.email_address}</td>
                          <td className="p-2 text-xs">{m.mobile_number}</td>
                          <td className="p-2 text-center">
                            <Badge variant={m.power === '대표' ? 'default' : 'outline'}>{m.power}</Badge>
                          </td>
                          <td className="p-2 text-center space-x-1">
                            {m.user_id !== user?.userId && m.power !== '대표' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleChangePower(m.user_id, m.power === '관리자' ? '직원' : '관리자')}
                                >
                                  {m.power === '관리자' ? '→직원' : '→관리자'}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDeleteUser(m)}>
                                  삭제
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* 거래처 관리 */}
        {canViewCustomers && (
          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
