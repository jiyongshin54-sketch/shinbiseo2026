'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { COMPANY_POWER } from '@/lib/constants'

export default function FirstLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 회사 창설 폼
  const [companyName, setCompanyName] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [companyPower, setCompanyPower] = useState<string>(COMPANY_POWER.BUYER)
  const [userName, setUserName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  // 회사 가입 폼
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ company_id: string; company_name: string; business_id: string | null }>>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [joinUserName, setJoinUserName] = useState('')
  const [joinMobileNumber, setJoinMobileNumber] = useState('')

  // 회사 창설 처리
  const handleCreateCompany = async () => {
    if (!companyName || !userName) {
      setError('회사명과 이름은 필수입니다.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 정보가 없습니다.')

      // 새 CompanyID 채번
      const { data: maxCompany } = await supabase
        .from('companies')
        .select('company_id')
        .order('company_id', { ascending: false })
        .limit(1)
        .single()

      const nextId = maxCompany
        ? String(parseInt(maxCompany.company_id) + 1).padStart(5, '0')
        : '00001'

      // companies INSERT
      const { error: companyError } = await supabase.from('companies').insert({
        company_id: nextId,
        company_name: companyName,
        business_id: businessId || null,
        owner_name: ownerName || null,
        phone_number: phoneNumber || null,
        power: companyPower,
        status: '신청',
        request_time: new Date().toISOString(),
      })

      if (companyError) throw companyError

      // users INSERT (대표)
      const googleId = user.user_metadata?.provider_id || user.user_metadata?.sub || user.id
      const { error: userError } = await supabase.from('users').insert({
        user_id: String(googleId).padEnd(21, '0').substring(0, 21),
        auth_uid: user.id,
        user_name: userName,
        mobile_number: mobileNumber || null,
        company_id: nextId,
        power: '대표',
        status: '신청',
        request_time: new Date().toISOString(),
        email_address: user.email || null,
      })

      if (userError) throw userError

      router.push('/waiting')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 회사 검색
  const handleSearchCompany = async () => {
    if (!searchKeyword) return
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('company_id, company_name, business_id')
      .or(`company_name.ilike.%${searchKeyword}%,business_id.ilike.%${searchKeyword}%`)
      .eq('status', '승인')
      .limit(10)

    setSearchResults(data || [])
  }

  // 회사 가입 처리
  const handleJoinCompany = async () => {
    if (!selectedCompanyId || !joinUserName) {
      setError('회사를 선택하고 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 정보가 없습니다.')

      const googleId = user.user_metadata?.provider_id || user.user_metadata?.sub || user.id
      const { error: userError } = await supabase.from('users').insert({
        user_id: String(googleId).padEnd(21, '0').substring(0, 21),
        auth_uid: user.id,
        user_name: joinUserName,
        mobile_number: joinMobileNumber || null,
        company_id: selectedCompanyId,
        power: '직원',
        status: '신청',
        request_time: new Date().toISOString(),
        email_address: user.email || null,
      })

      if (userError) throw userError

      router.push('/waiting')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>신비서 시작하기</CardTitle>
          <CardDescription>
            새 회사를 등록하거나, 기존 회사에 가입하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">회사 창설 (대표)</TabsTrigger>
              <TabsTrigger value="join">회사 가입 (직원)</TabsTrigger>
            </TabsList>

            {/* 회사 창설 */}
            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">회사명 *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="회사명을 입력하세요" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="businessId">사업자번호</Label>
                <Input id="businessId" value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="000-00-00000" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerName">대표자명</Label>
                <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>회사 구분 *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="power" value="구매" checked={companyPower === '구매'} onChange={(e) => setCompanyPower(e.target.value)} />
                    구매회사
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="power" value="판매" checked={companyPower === '판매'} onChange={(e) => setCompanyPower(e.target.value)} />
                    판매회사
                  </label>
                </div>
              </div>
              <hr />
              <div className="grid gap-2">
                <Label htmlFor="userName">이름 *</Label>
                <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobileNumber">휴대폰번호</Label>
                <Input id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
              </div>
              <Button onClick={handleCreateCompany} disabled={loading} className="w-full">
                {loading ? '처리 중...' : '회사 창설 신청'}
              </Button>
            </TabsContent>

            {/* 회사 가입 */}
            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>회사 검색</Label>
                <div className="flex gap-2">
                  <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="회사명 또는 사업자번호" onKeyDown={(e) => e.key === 'Enter' && handleSearchCompany()} />
                  <Button variant="outline" onClick={handleSearchCompany}>검색</Button>
                </div>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded">
                  {searchResults.map((company) => (
                    <div
                      key={company.company_id}
                      className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedCompanyId === company.company_id ? 'bg-blue-50 border-blue-200' : ''}`}
                      onClick={() => setSelectedCompanyId(company.company_id)}
                    >
                      <span className="font-medium">{company.company_name}</span>
                      {company.business_id && (
                        <span className="ml-2 text-sm text-gray-500">{company.business_id}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <hr />
              <div className="grid gap-2">
                <Label htmlFor="joinUserName">이름 *</Label>
                <Input id="joinUserName" value={joinUserName} onChange={(e) => setJoinUserName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="joinMobileNumber">휴대폰번호</Label>
                <Input id="joinMobileNumber" value={joinMobileNumber} onChange={(e) => setJoinMobileNumber(e.target.value)} />
              </div>
              <Button onClick={handleJoinCompany} disabled={loading || !selectedCompanyId} className="w-full">
                {loading ? '처리 중...' : '가입 신청'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
