# Step 7: 회사 설정 (MyCompany)

## 개요
MyCompany.aspx 클론. 회사 정보 관리, 직원 관리, 제품 관리 (판매회사).

## 섹션 구성

### 1. 회사 정보 (모든 사용자)
- 회사명, 사업자번호, 대표자명, 전화번호, 팩스 등
- 대표/관리자만 수정 가능, 직원은 읽기 전용

### 2. 직원 관리 (대표만)
- 회사 소속 직원 목록
- 신규 가입 신청 승인/거절
- 직원 권한 변경 (직원 ↔ 관리자)
- 직원 삭제 (소프트 삭제 → users_deleted)

### 3. 제품 관리 (판매회사 + 대표/관리자)
- 카테고리별 제품 목록
- 제품 등록/수정/삭제
- 속성(Attribute 1~10) 설정
- 가격 등급(UnitPrice 1~20) 설정

## 권한 매트릭스
| 기능 | 대표 | 관리자 | 직원 |
|------|------|--------|------|
| 회사 정보 조회 | O | O | O |
| 회사 정보 수정 | O | O | X |
| 직원 목록 | O | X | X |
| 직원 승인/삭제 | O | X | X |
| 제품 관리 | O (판매) | O (판매) | X |

## API 설계

### PATCH /api/companies/[companyId]
```
Body: { company_name, phone_number, ... }
권한: 대표/관리자만
```

### GET /api/users?company_id=xxx
```
Response: User[] (같은 회사 직원 목록)
권한: 대표만
```

### PATCH /api/users/[userId]/status
```
Body: { status: '승인' | '삭제', power?: '관리자' | '직원' }
권한: 대표만
```

### GET /api/products?seller_id=xxx
```
Response: Product[]
권한: 판매회사 대표/관리자
```

### POST /api/products
```
Body: Product 데이터
처리: product_id 자동 채번 → INSERT
```

### PATCH /api/products/[sellerId]/[productId]
### DELETE /api/products/[sellerId]/[productId]

## 컴포넌트 구조
```
/my-company/page.tsx
├── Tabs
│   ├── Tab: 회사 정보
│   │   └── CompanyInfoForm
│   ├── Tab: 직원 관리 (대표만)
│   │   ├── PendingUsersList (승인 대기)
│   │   └── ActiveUsersList (승인된 직원)
│   └── Tab: 제품 관리 (판매회사만)
│       ├── ProductSearchBar (카테고리 필터)
│       ├── ProductList (테이블)
│       └── ProductFormDialog (등록/수정)
```

## 완료 체크리스트
- [ ] 회사 정보 폼 (조회/수정)
- [ ] 직원 목록 + 승인/거절/삭제
- [ ] 제품 CRUD
- [ ] 권한별 탭 표시/숨김
- [ ] API Routes 구현
