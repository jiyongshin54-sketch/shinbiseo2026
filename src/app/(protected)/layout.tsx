import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/layout/nav-bar'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select(`
      user_id,
      user_name,
      power,
      status,
      company_id,
      is_admin,
      companies (
        company_name,
        company_alias,
        power,
        status
      )
    `)
    .eq('auth_uid', user.id)
    .single()

  if (!dbUser || dbUser.status !== '승인') {
    redirect('/waiting')
  }

  const company = Array.isArray(dbUser.companies)
    ? dbUser.companies[0]
    : dbUser.companies

  if (!company || company.status !== '승인') {
    redirect('/waiting')
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Nanum Gothic', sans-serif", fontSize: '14px' }}>
      {/* 헤더 - 구 앱 스타일 (cornflowerblue 배경) */}
      <header className="sticky top-0 z-50">
        {/* 상단 타이틀 바 */}
        <div
          className="flex items-center justify-between px-4"
          style={{ backgroundColor: 'cornflowerblue', height: '62px' }}
        >
          <div className="flex items-center gap-3">
            {/* 로고 자리 */}
            <div
              className="flex items-center justify-center rounded"
              style={{ width: '50px', height: '50px', backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <span className="text-white font-bold text-lg">신</span>
            </div>
            <span style={{ fontSize: '25px', color: 'white', fontWeight: 'bold' }}>
              신BS - 포장자재 온라인 도매시장
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ color: 'silver' }}>
            <span>{company.company_name}({dbUser.power})</span>
            {dbUser.is_admin && (
              <a
                href="/admin"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                관리자
              </a>
            )}
            <form action="/api/auth/signout" method="post" className="ml-2">
              <button
                type="submit"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* 메뉴 네비게이션 바 */}
        <NavBar />
      </header>

      {/* 콘텐츠 - 구 앱 max-width 1500px */}
      <main className="max-w-[1500px] mx-auto p-2">
        {children}
      </main>
    </div>
  )
}
