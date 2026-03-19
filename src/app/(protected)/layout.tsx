import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// 구 앱 메뉴 8개 (그룹 구분선 위치: 거래처관리 앞, 주문관리 앞, 우리회사 앞)
const NAV_ITEMS = [
  { href: '/main', label: 'Main 화면', group: false },
  { href: '/customers', label: '거래처 관리', group: true },
  { href: '/trading-stubs', label: '거래명세표 관리', group: false },
  { href: '/e-tax-bill', label: '세금계산서 관리', group: false },
  { href: '/orders', label: '주문 관리', group: true },
  { href: '/ready-made-order', label: '기성품 주문', group: false },
  { href: '/custom-order', label: '맞춤품 주문', group: false },
  { href: '/my-company', label: '우리 회사 관리', group: true },
]

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

        {/* 메뉴 네비게이션 바 - 구 앱 whitesmoke + cornflowerblue 테두리 */}
        <nav
          className="overflow-x-auto"
          style={{
            backgroundColor: 'whitesmoke',
            borderTop: 'thin solid cornflowerblue',
            borderBottom: 'thin solid cornflowerblue',
          }}
        >
          <div className="flex max-w-[1500px] mx-auto">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex-1 text-center py-2 hover:bg-gray-200 transition-colors"
                style={{
                  color: 'darkslateblue',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  borderLeft: item.group ? 'thin solid cornflowerblue' : 'none',
                  minWidth: '0',
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* 콘텐츠 - 구 앱 max-width 1500px */}
      <main className="max-w-[1500px] mx-auto p-2">
        {children}
      </main>
    </div>
  )
}
