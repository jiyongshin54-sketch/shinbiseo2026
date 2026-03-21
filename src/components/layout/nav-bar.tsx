'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

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

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      className="overflow-x-auto"
      style={{
        backgroundColor: 'whitesmoke',
        borderTop: 'thin solid cornflowerblue',
        borderBottom: 'thin solid cornflowerblue',
      }}
    >
      <div className="flex max-w-[1500px] mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 text-center py-2 transition-colors"
              style={{
                color: isActive ? '#1e3a5f' : 'darkslateblue',
                fontWeight: 'bold',
                fontSize: '14px',
                backgroundColor: isActive ? '#dbeafe' : 'transparent',
                borderLeft: item.group ? 'thin solid cornflowerblue' : 'none',
                minWidth: '0',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
