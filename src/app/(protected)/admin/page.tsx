'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface PendingUser {
  user_id: string
  user_name: string
  company_id: string
  status: string
  power: string
  mobile_number: string
  email_address: string
  request_time: string
  company_name?: string
}

interface PendingCompany {
  company_id: string
  company_name: string
  business_id: string
  owner_name: string
  status: string
  power: string
  request_time: string
  address: string
  phone_number: string
}

type TabKey = 'users' | 'companies' | 'switch-company'

export default function AdminPage() {
  const { user, isSysAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabKey>('users')
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([])
  const [allCompanies, setAllCompanies] = useState<PendingCompany[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [switchLoading, setSwitchLoading] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const canAccess = isSysAdmin

  const loadPendingUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, user_name, company_id, status, power, mobile_number, email_address, request_time')
        .eq('status', '등록')
        .order('request_time', { ascending: false })

      if (error) throw error

      if (!users || users.length === 0) {
        setPendingUsers([])
        return
      }

      // 회사명 매핑
      const companyIds = [...new Set(users.map(u => u.company_id).filter(Boolean))]
      const companiesMap = new Map<string, string>()
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('company_id, company_name')
          .in('company_id', companyIds)
        companies?.forEach(c => companiesMap.set(c.company_id, c.company_name))
      }

      setPendingUsers(users.map(u => ({
        ...u,
        company_name: u.company_id ? (companiesMap.get(u.company_id) || '알 수 없음') : '회사 없음'
      })))
    } catch (err) {
      console.error('승인 대기 사용자 조회 오류:', err)
      toast.error('사용자 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setUsersLoading(false)
    }
  }, [supabase])

  const loadPendingCompanies = useCallback(async () => {
    setCompaniesLoading(true)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('company_id, company_name, business_id, owner_name, status, power, request_time, address, phone_number')
        .eq('status', '등록')
        .order('request_time', { ascending: false })

      if (error) throw error
      setPendingCompanies(data || [])
    } catch (err) {
      console.error('승인 대기 회사 조회 오류:', err)
      toast.error('회사 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setCompaniesLoading(false)
    }
  }, [supabase])

  const loadAllCompanies = useCallback(async () => {
    setSwitchLoading(true)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('company_id, company_name, business_id, owner_name, status, power, request_time, address, phone_number')
        .order('company_id', { ascending: true })

      if (error) throw error
      setAllCompanies(data || [])
    } catch (err) {
      console.error('전체 회사 목록 조회 오류:', err)
      toast.error('회사 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setSwitchLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (authLoading) return
    if (!canAccess) {
      toast.error('관리자 권한이 없습니다.')
      router.push('/')
      return
    }
    loadPendingUsers()
    loadPendingCompanies()
  }, [authLoading, canAccess, router, loadPendingUsers, loadPendingCompanies])

  const approveUser = async (userId: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: '승인',
          approve_id: user.userId,
          approve_time: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error
      toast.success('사용자가 승인되었습니다.')
      await loadPendingUsers()
    } catch (err) {
      console.error('사용자 승인 오류:', err)
      toast.error('사용자 승인 중 오류가 발생했습니다.')
    }
  }

  const approveCompany = async (companyId: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          status: '승인',
          approve_id: user.userId,
          approve_time: new Date().toISOString()
        })
        .eq('company_id', companyId)

      if (error) throw error
      toast.success('회사가 승인되었습니다.')
      await loadPendingCompanies()
    } catch (err) {
      console.error('회사 승인 오류:', err)
      toast.error('회사 승인 중 오류가 발생했습니다.')
    }
  }

  const switchCompany = async (targetCompanyId: string) => {
    if (!user) return
    setSwitchingId(targetCompanyId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ company_id: targetCompanyId })
        .eq('user_id', user.userId)

      if (error) throw error
      const target = allCompanies.find(c => c.company_id === targetCompanyId)
      toast.success(`회사 전환 완료: ${target?.company_name || targetCompanyId}`)
      // 페이지 새로고침으로 세션 갱신
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      console.error('회사 전환 오류:', err)
      toast.error('회사 전환 중 오류가 발생했습니다.')
    } finally {
      setSwitchingId(null)
    }
  }

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">권한 확인 중...</div>
  }

  if (!canAccess) return null

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'users', label: '사용자 승인' },
    { key: 'companies', label: '회사 승인' },
    { key: 'switch-company', label: '회사 전환 (테스트)' },
  ]

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">신BS 관리자</h1>
          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">Admin</span>
        </div>
        <div className="text-sm text-gray-500">
          관리자: <span className="font-medium">{user?.userName}</span> | 현재 회사: <span className="text-orange-600 font-medium">{user?.companyId}</span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key)
              if (key === 'switch-company' && allCompanies.length === 0) loadAllCompanies()
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? key === 'switch-company'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 사용자 승인 탭 */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">승인 대기 사용자</h2>
            <button
              onClick={loadPendingUsers}
              disabled={usersLoading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-xs"
            >
              {usersLoading ? '로딩...' : '새로고침'}
            </button>
          </div>

          <div className="bg-white border rounded overflow-hidden">
            {usersLoading ? (
              <div className="p-6 text-center text-gray-500">로딩 중...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">승인 대기 중인 사용자가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">사용자</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">회사</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">권한</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">연락처</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">신청일시</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingUsers.map(u => (
                    <tr key={u.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium">{u.user_name}</div>
                        <div className="text-xs text-gray-500">{u.email_address}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div>{u.company_name}</div>
                        <div className="text-xs text-gray-500">ID: {u.company_id}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">{u.power}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{u.mobile_number}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {u.request_time ? new Date(u.request_time).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => approveUser(u.user_id)}
                          className="px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          승인
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 회사 승인 탭 */}
      {activeTab === 'companies' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">승인 대기 회사</h2>
            <button
              onClick={loadPendingCompanies}
              disabled={companiesLoading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded text-xs"
            >
              {companiesLoading ? '로딩...' : '새로고침'}
            </button>
          </div>

          <div className="bg-white border rounded overflow-hidden">
            {companiesLoading ? (
              <div className="p-6 text-center text-gray-500">로딩 중...</div>
            ) : pendingCompanies.length === 0 ? (
              <div className="p-6 text-center text-gray-500">승인 대기 중인 회사가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">회사</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">사업자번호</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">대표</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">구분</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">신청일시</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingCompanies.map(c => (
                    <tr key={c.company_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium">{c.company_name}</div>
                        <div className="text-xs text-gray-500">ID: {c.company_id} | {c.phone_number}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div>{c.business_id}</div>
                        <div className="text-gray-500">{c.address}</div>
                      </td>
                      <td className="px-4 py-2">{c.owner_name}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">{c.power}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {c.request_time ? new Date(c.request_time).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => approveCompany(c.company_id)}
                          className="px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          승인
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 회사 전환 탭 */}
      {activeTab === 'switch-company' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-base font-semibold">회사 전환 (테스트용)</h2>
              <p className="text-xs text-orange-600 mt-1">내 계정의 소속 회사를 변경합니다. 테스트 목적으로만 사용하세요.</p>
            </div>
            <button
              onClick={loadAllCompanies}
              disabled={switchLoading}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded text-xs"
            >
              {switchLoading ? '로딩...' : '새로고침'}
            </button>
          </div>

          <div className="bg-white border rounded overflow-hidden">
            {switchLoading ? (
              <div className="p-6 text-center text-gray-500">로딩 중...</div>
            ) : allCompanies.length === 0 ? (
              <div className="p-6 text-center text-gray-500">등록된 회사가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">회사ID</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">회사명</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">사업자번호</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">대표</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">구분</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">상태</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">전환</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allCompanies.map(c => {
                    const isCurrent = c.company_id === user?.companyId
                    return (
                      <tr key={c.company_id} className={isCurrent ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2 text-xs">{c.company_id}</td>
                        <td className="px-4 py-2 font-medium">
                          {c.company_name}
                          {isCurrent && <span className="ml-2 text-xs text-orange-600">(현재)</span>}
                        </td>
                        <td className="px-4 py-2 text-xs">{c.business_id}</td>
                        <td className="px-4 py-2">{c.owner_name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            c.power === '판매' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>{c.power}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            c.status === '승인' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          {isCurrent ? (
                            <span className="text-xs text-gray-400">현재 소속</span>
                          ) : (
                            <button
                              onClick={() => switchCompany(c.company_id)}
                              disabled={switchingId === c.company_id}
                              className="px-3 py-1 text-xs text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded"
                            >
                              {switchingId === c.company_id ? '전환 중...' : '전환'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
