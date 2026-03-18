# Step 12: Vercel 배포 + 도메인 설정

## 배포 아키텍처
```
[사용자] → [Vercel (Next.js)] → [Supabase Cloud (PostgreSQL + Auth)]
                ↓
        [Vercel Edge Network]
        - 서울 리전 자동 선택
        - SSR / API Routes
```

## Vercel 배포

### 1. GitHub 연동
```bash
cd D:\신지용\shinbiseo2026
git init
git add .
git commit -m "Initial commit: shinbiseo2026"
git remote add origin https://github.com/xxx/shinbiseo2026.git
git push -u origin main
```

### 2. Vercel 프로젝트 설정
- Vercel Dashboard → New Project → GitHub 레포 연결
- Framework: Next.js (자동 감지)
- Build Command: `next build`
- Output Directory: `.next`

### 3. 환경 변수 설정 (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

### 4. 도메인 설정
- Vercel → Settings → Domains
- 커스텀 도메인 연결 (예: new.shinbiseo.com)
- DNS 설정: CNAME → cname.vercel-dns.com

## Supabase Cloud 설정

### 리전 선택
- Northeast Asia (Tokyo) - 한국에서 가장 가까운 리전

### 프로젝트 설정
- Database Password 안전하게 보관
- API URL, anon key, service_role key 확인

### Google OAuth 리다이렉트 URL 업데이트
- 개발: `http://localhost:3000/auth/callback`
- 프로덕션: `https://new.shinbiseo.com/auth/callback`

## 배포 체크리스트
- [ ] GitHub 레포 생성 + 코드 push
- [ ] Vercel 프로젝트 생성 + 연결
- [ ] 환경 변수 설정
- [ ] 빌드 성공 확인
- [ ] 도메인 연결
- [ ] SSL 인증서 확인
- [ ] Google OAuth 리다이렉트 URL 업데이트
- [ ] 프로덕션 환경 E2E 테스트
