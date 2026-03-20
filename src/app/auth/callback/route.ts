import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // RLS를 우회하는 admin client 사용 (마이그레이션 사용자 매칭용)
    const adminClient = createAdminClient()

    // users 테이블에서 auth_uid로 조회
    const { data: dbUser } = await adminClient
      .from('users')
      .select('user_id, status, company_id')
      .eq('auth_uid', user.id)
      .single()

    if (!dbUser) {
      // users 테이블에 없음 → Google ID로 기존 사용자 확인 (마이그레이션)
      const googleId = user.user_metadata?.provider_id || user.user_metadata?.sub
      console.log('[AUTH CALLBACK] auth_uid:', user.id, 'googleId:', googleId)

      if (googleId) {
        const { data: legacyUser, error: legacyError } = await adminClient
          .from('users')
          .select('user_id, status, company_id')
          .eq('user_id', googleId)
          .is('auth_uid', null)
          .single()

        console.log('[AUTH CALLBACK] legacyUser:', legacyUser, 'legacyError:', legacyError)

        if (legacyUser) {
          // 기존 사용자 → auth_uid 매핑
          const { error: updateError } = await adminClient
            .from('users')
            .update({ auth_uid: user.id })
            .eq('user_id', googleId)

          if (updateError) {
            console.error('[AUTH CALLBACK] auth_uid update failed:', updateError)
          } else {
            console.log('[AUTH CALLBACK] Legacy user matched:', googleId, '→', user.id)
          }

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
