import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  // users + companies JOIN으로 사용자 정보 조회
  const { data: dbUser } = await supabase
    .from('users')
    .select(`
      user_id,
      user_name,
      power,
      status,
      company_id,
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

  // companies 데이터 타입 처리
  const company = Array.isArray(dbUser.companies)
    ? dbUser.companies[0]
    : dbUser.companies

  if (!company || company.status !== '승인') {
    redirect('/waiting')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-blue-600">신비서</h1>
            <nav className="hidden md:flex items-center gap-1">
              <a href="/main" className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">메인</a>
              <a href="/my-company" className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">내 회사</a>
              <a href="/billing" className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">청구서</a>
              <a href="/trading-stub-print" className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">거래명세표</a>
              <a href="/e-tax-bill" className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">전자세금계산서</a>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-muted-foreground">
              {company.company_name}
              <span className="ml-1 text-xs">({company.power})</span>
            </span>
            <span className="font-medium">{dbUser.user_name}</span>
            <span className="text-xs text-muted-foreground">({dbUser.power})</span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {children}
      </main>
    </div>
  )
}
