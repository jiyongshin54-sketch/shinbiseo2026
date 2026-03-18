# Step 0: 프로젝트 초기 설정

## 0-1. Next.js 프로젝트 생성
```bash
cd D:\신지용\shinbiseo2026
npx create-next-app@latest . --typescript --tailwind --app --src-dir --use-npm
```
선택 옵션:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- src/ directory: Yes
- App Router: Yes
- Turbopack: Yes
- Import alias: @/*

## 0-2. 핵심 패키지 설치
```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui 초기화
npx shadcn-ui@latest init

# 상태관리
npm install zustand

# 유틸리티
npm install date-fns react-hot-toast

# shadcn/ui 컴포넌트 (필요시 추가)
npx shadcn-ui@latest add button input label card table dialog select dropdown-menu tabs toast badge separator sheet scroll-area
```

## 0-3. 환경 변수
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx  # 서버 전용, NEXT_PUBLIC_ 붙이지 않음
```

## 0-4. 프로젝트 디렉토리 구조 생성
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── first-login/page.tsx
│   ├── waiting/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx
│   │   ├── main/page.tsx
│   │   ├── my-company/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── design-file/page.tsx
│   │   ├── e-tax-bill/page.tsx
│   │   ├── pungwon/page.tsx
│   │   ├── reground/page.tsx
│   │   └── trading-stub-print/page.tsx
│   └── api/
│       ├── orders/route.ts
│       ├── customers/route.ts
│       ├── products/route.ts
│       ├── trading-stubs/route.ts
│       └── companies/route.ts
├── components/
│   ├── ui/           # shadcn/ui 자동 생성
│   ├── layout/
│   ├── orders/
│   ├── customers/
│   ├── products/
│   ├── billing/
│   └── trading-stubs/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── constants.ts
│   ├── types.ts
│   └── utils.ts
├── hooks/
│   ├── use-auth.ts
│   ├── use-company-power.ts
│   └── use-user-power.ts
├── stores/
│   └── cart-store.ts
└── middleware.ts
```

## 0-5. Supabase 클라이언트 설정

### src/lib/supabase/client.ts (브라우저용)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### src/lib/supabase/server.ts (서버용)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* Server Component에서는 무시 */ }
        },
      },
    }
  )
}
```

### src/middleware.ts
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 비인증 사용자 → 로그인 페이지로
  const publicPaths = ['/login', '/auth/callback']
  if (!user && !publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

## 완료 체크리스트
- [ ] Next.js 프로젝트 생성 완료
- [ ] 패키지 설치 완료
- [ ] shadcn/ui 초기화 완료
- [ ] 환경 변수 설정 (.env.local)
- [ ] Supabase 클라이언트 파일 생성
- [ ] middleware.ts 생성
- [ ] 디렉토리 구조 생성
- [ ] `npm run dev` 정상 실행 확인
