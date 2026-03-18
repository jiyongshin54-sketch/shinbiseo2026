'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function WaitingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // 5초 간격으로 승인 상태 확인
    const interval = setInterval(async () => {
      setChecking(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: dbUser } = await supabase
          .from('users')
          .select('status')
          .eq('auth_uid', user.id)
          .single()

        if (dbUser?.status === '승인') {
          router.push('/main')
        }
      } finally {
        setChecking(false)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>승인 대기 중</CardTitle>
          <CardDescription>
            관리자의 승인을 기다리고 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {checking ? (
              <span className="animate-pulse">상태 확인 중...</span>
            ) : (
              <span>자동으로 상태를 확인하고 있습니다.</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            승인이 완료되면 자동으로 메인 화면으로 이동합니다.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
