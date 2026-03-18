import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 인증된 사용자: users 테이블에서 상태 확인
  const { data: dbUser } = await supabase
    .from('users')
    .select('status, company_id')
    .eq('auth_uid', user.id)
    .single()

  if (!dbUser) {
    // users 테이블에 없음 → 최초 로그인
    redirect('/first-login')
  }

  if (dbUser.status !== '승인') {
    // 승인 대기 중
    redirect('/waiting')
  }

  // 승인된 사용자 → 메인 대시보드
  redirect('/main')
}
