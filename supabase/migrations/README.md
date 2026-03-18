# Supabase 마이그레이션 실행 순서

## 실행 방법
Supabase Dashboard → SQL Editor에서 순서대로 실행

## 파일 순서

### 1. `001_create_tables.sql`
- 13개 테이블 생성
- 인덱스 생성
- **먼저 실행**

### 2. `002_rls_policies.sql`
- 헬퍼 함수 4개 (get_my_company_id, get_my_company_power, get_my_user_power, get_my_user_id)
- RLS 활성화 (13개 테이블)
- RLS 정책 (SELECT/INSERT/UPDATE/DELETE)
- **001 실행 후 실행**

## 참고
- 테이블을 다시 만들려면 먼저 DROP 필요
- RLS 정책은 테이블이 존재해야 실행 가능
