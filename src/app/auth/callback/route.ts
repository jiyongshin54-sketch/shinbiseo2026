import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()

    // OAuth code → session 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // users 테이블에서 auth_uid로 조회
    const { data: dbUser } = await supabase
      .from('users')
      .select('user_id, status, company_id')
      .eq('auth_uid', user.id)
      .single()

    if (!dbUser) {
      // users 테이블에 없음 → 최초 로그인
      // Google ID로도 한번 더 확인 (기존 사용자 마이그레이션)
      const googleId = user.user_metadata?.provider_id || user.user_metadata?.sub
      if (googleId) {
        const { data: legacyUser } = await supabase
          .from('users')
          .select('user_id, status, company_id')
          .eq('user_id', googleId)
          .is('auth_uid', null)
          .single()

        if (legacyUser) {
          // 기존 사용자 → auth_uid 매핑
          await supabase
            .from('users')
            .update({ auth_uid: user.id })
            .eq('user_id', googleId)

          if (legacyUser.status === '승인') {
            return NextResponse.redirect(`${origin}/main`)
          }
          return NextResponse.redirect(`${origin}/waiting`)
        }
      }

      return NextResponse.redirect(`${origin}/first-login`)
    }

    // 상태에 따라 리다이렉트
    if (dbUser.status !== '승인') {
      return NextResponse.redirect(`${origin}/waiting`)
    }

    return NextResponse.redirect(`${origin}/main`)
  }

  // code가 없으면 에러
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
