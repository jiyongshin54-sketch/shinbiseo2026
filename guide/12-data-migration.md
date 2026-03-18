# Step 11: 데이터 마이그레이션

## 개요
기존 MySQL 데이터 (SQL dump 파일)를 Supabase PostgreSQL로 마이그레이션.

## 원본 데이터 위치
```
D:\신지용\AWS Renewal\2026\DB20251129\
├── sbsdatabase_Companies.sql
├── sbsdatabase_CompaniesDeleted.sql
├── sbsdatabase_Contracts.sql
├── sbsdatabase_Customers.sql
├── sbsdatabase_CustomersDeleted.sql
├── sbsdatabase_OrdersD.sql
├── sbsdatabase_OrdersM.sql
├── sbsdatabase_Products.sql
├── sbsdatabase_TradingStubsD.sql
├── sbsdatabase_TradingStubsM.sql
├── sbsdatabase_Users.sql
├── sbsdatabase_UsersDeleted.sql
└── sbsdatabase_Categories.sql
```

## 마이그레이션 단계

### 1단계: SQL 변환 스크립트 작성
MySQL INSERT → PostgreSQL INSERT 변환:
- 백틱(`) 제거
- datetime 형식 호환 확인
- 이스케이프 문자 처리 (\'→'' 등)
- 컬럼명 PascalCase → snake_case 변환
- 테이블명 변환

### 2단계: 테이블별 데이터 삽입 순서
의존성 순서:
```
1. categories (의존성 없음)
2. companies (의존성 없음)
3. companies_deleted
4. users (→ companies FK)
5. users_deleted
6. customers (→ companies 참조)
7. customers_deleted
8. contracts (→ companies 참조)
9. products (→ categories FK)
10. orders_m
11. orders_d (→ orders_m)
12. trading_stubs_m (→ orders_m 참조)
13. trading_stubs_d (→ trading_stubs_m)
```

### 3단계: auth_uid 매핑
- 기존 users의 user_id (Google 21자리) 보존
- 기존 사용자가 Supabase Auth로 재로그인 시:
  - Google OAuth로 로그인 → auth.users에 새 UUID 생성
  - Google provider_id (sub claim) = 기존 user_id
  - /auth/callback에서 매칭 → users.auth_uid UPDATE

### 4단계: 검증
```sql
-- 레코드 수 비교
SELECT 'companies' as tbl, COUNT(*) FROM companies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'orders_m', COUNT(*) FROM orders_m
UNION ALL SELECT 'orders_d', COUNT(*) FROM orders_d
...
```

## 마이그레이션 스크립트 (Node.js)
```
scripts/
├── migrate.ts           # 메인 실행 스크립트
├── convert-sql.ts       # MySQL → PostgreSQL 변환
└── verify-migration.ts  # 검증 스크립트
```

## 주의사항
- orders_d, orders_m 파일이 각 12~13MB로 가장 큼 → 배치 INSERT 필요
- RLS가 활성화된 상태에서는 service_role_key 사용
- 중복 실행 방지 (UPSERT 또는 사전 TRUNCATE)

## 완료 체크리스트
- [ ] SQL 변환 스크립트 작성
- [ ] 테이블별 데이터 삽입 (순서대로)
- [ ] auth_uid 매핑 로직 구현
- [ ] 레코드 수 검증
- [ ] 샘플 데이터 조회 검증
- [ ] 기존 기능 대비 데이터 정합성 확인
