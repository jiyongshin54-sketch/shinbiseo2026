# Step 2: 인증 시스템

## 개요
기존 Google OAuth 직접 연동 → Supabase Auth (Google Provider) 전환.
기존 UserID(21자리 Google ID)는 users.user_id로 보존, Supabase auth.users.id(UUID)는 users.auth_uid로 매핑.

## Supabase Auth 설정

### Google OAuth Provider 설정
1. Supabase Dashboard → Authentication → Providers → Google 활성화
2. Google Cloud Console → OAuth 2.0 Client ID 생성
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Client ID, Client Secret을 Supabase에 입력

## 인증 플로우

```
사용자 접속
  ↓
/login 페이지
  ↓ [Google로 로그인 버튼]
supabase.auth.signInWithOAuth({ provider: 'google' })
  ↓
Google 인증 완료
  ↓
/auth/callback (Route Handler)
  ↓ code → session 교환
users 테이블에서 auth_uid 조회
  ↓
  ├─ 없음 → /first-login (신규 사용자)
  │   ├─ 회사 창설 (대표로 가입) → companies + users INSERT → /waiting
  │   └─ 기존 회사 가입 (직원으로) → users INSERT (status='신청') → /waiting
  │
  ├─ status='신청' → /waiting (승인 대기)
  │
  └─ status='승인' → /main (메인 대시보드)
```

## 페이지별 구현

### /login (Login.aspx 클론)
```
- Google 로그인 버튼 1개
- 신비서 로고 + 간단한 설명
- supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` }
  })
```

### /auth/callback (Route Handler)
```typescript
// src/app/auth/callback/route.ts
// 1. code → session 교환
// 2. auth.getUser()로 Supabase auth_uid 획득
// 3. users 테이블에서 auth_uid로 조회
//    → 없으면 → /first-login 리다이렉트
//    → status != '승인' → /waiting 리다이렉트
//    → status == '승인' → /main 리다이렉트
```

### /first-login (FirstLogin.aspx 클론)
```
두 가지 모드:
1. [회사 창설] - 새 판매/구매 회사 등록
   - 회사명, 사업자번호, 대표자명, 전화번호, 주소 등 입력
   - companies INSERT (status='신청') + users INSERT (power='대표', status='신청')

2. [회사 가입] - 기존 회사에 직원으로 가입
   - 회사 검색 (회사명 또는 사업자번호)
   - users INSERT (power='직원', status='신청')

공통:
- Supabase Auth에서 가져온 정보: email, google_id
- 사용자 추가 입력: 이름, 휴대폰번호
```

### /waiting (Waiting.aspx 클론)
```
- "승인 대기 중" 메시지
- 5초 간격 polling 또는 Supabase Realtime으로 users.status 변경 감지
- status='승인' 되면 자동으로 /main 이동
- 로그아웃 버튼
```

## 세션 데이터 매핑

기존 Session 변수 → 새로운 방식:

| 기존 (Session) | 새로운 (Supabase) | 획득 방법 |
|---------------|-------------------|----------|
| MyID | user.auth_uid | supabase.auth.getUser() |
| MyGoogleID | users.user_id | users 테이블 조회 |
| MyName | users.user_name | users 테이블 조회 |
| MyCompanyID | users.company_id | users 테이블 조회 |
| MyCompanyName | companies.company_name | companies JOIN |
| MyCompanyAlias | companies.company_alias | companies JOIN |
| MyCompanyPower | companies.power | companies JOIN |
| MyPower | users.power | users 테이블 조회 |

### useAuth 훅
```typescript
// src/hooks/use-auth.ts
// 현재 로그인 사용자의 전체 정보를 제공
// - Supabase Auth session
// - users 테이블 정보
// - companies 테이블 정보 (JOIN)
// - 로딩/에러 상태

interface AuthUser {
  authUid: string           // Supabase UUID
  userId: string            // 기존 Google 21자리 ID
  userName: string
  mobileNumber: string
  emailAddress: string
  companyId: string
  companyName: string
  companyAlias: string
  companyPower: '구매' | '판매'
  userPower: '대표' | '관리자' | '직원'
}
```

## Next.js Middleware 인증 체크

```
공개 경로 (인증 불필요):
  /login, /auth/callback

준공개 경로 (인증 필요, 승인 불필요):
  /first-login, /waiting

보호 경로 (인증 + 승인 필요):
  /(protected)/* → /main, /my-company, /billing 등
```

## 완료 체크리스트
- [ ] Supabase Google OAuth Provider 설정
- [ ] Google Cloud Console OAuth Client 설정
- [ ] /login 페이지 구현
- [ ] /auth/callback Route Handler 구현
- [ ] /first-login 페이지 구현 (회사 창설 + 가입)
- [ ] /waiting 페이지 구현
- [ ] useAuth 훅 구현
- [ ] middleware.ts 인증 분기 구현
- [ ] 전체 플로우 E2E 테스트
