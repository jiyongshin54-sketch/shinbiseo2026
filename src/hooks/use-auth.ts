'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select(`
          user_id, user_name, mobile_number, email_address, power, status, company_id, is_admin,
          companies ( company_name, company_alias, power )
        `)
        .eq('auth_uid', authUser.id)
        .single()

      if (!dbUser || dbUser.status !== '승인') {
        setUser(null)
        setLoading(false)
        return
      }

      const company = Array.isArray(dbUser.companies)
        ? dbUser.companies[0]
        : dbUser.companies

      setUser({
        authUid: authUser.id,
        userId: dbUser.user_id,
        userName: dbUser.user_name || '',
        mobileNumber: dbUser.mobile_number || '',
        emailAddress: dbUser.email_address || '',
        companyId: dbUser.company_id || '',
        companyName: company?.company_name || '',
        companyAlias: company?.company_alias || '',
        companyPower: company?.power as AuthUser['companyPower'],
        userPower: dbUser.power as AuthUser['userPower'],
        isSysAdmin: dbUser.is_admin === true,
      })
      setLoading(false)
    }

    fetchUser()
  }, [])

  const isSeller = user?.companyPower === '판매'
  const isBuyer = user?.companyPower === '구매'
  const isOwner = user?.userPower === '대표'
  const isAdmin = user?.userPower === '관리자'
  const isStaff = user?.userPower === '직원'
  const isSysAdmin = user?.isSysAdmin === true

  return {
    user,
    loading,
    isSeller,
    isBuyer,
    isOwner,
    isAdmin,
    isStaff,
    isSysAdmin,
    // 복합 권한
    canViewCustomers: isOwner || isAdmin,
    canSearchAllOrders: isOwner,
    canEditCompany: isOwner,
    canManageStaff: isOwner,
    canPrepareItems: isSeller,
    canConfirmPayment: isSeller,
    canAutoRefresh: isSeller,
    canViewAmountInList: !isSeller || isOwner, // 구매회사는 다 보임, 판매회사는 대표만
    canActOnOthersOrder: !isSeller || isOwner,
  }
}
