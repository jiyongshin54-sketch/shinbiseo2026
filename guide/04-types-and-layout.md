# Step 3: 타입 정의 + 권한 훅 + 공통 레이아웃

## TypeScript 타입 정의 (src/lib/types.ts)

### DB 테이블 타입
```typescript
// Companies
export interface Company {
  company_id: string
  company_name: string
  business_id: string | null
  owner_name: string | null
  phone_number: string | null
  fax_number: string | null
  email_address: string | null
  contact_id: string | null
  uptae: string | null
  jongmok: string | null
  address: string | null
  homepage: string | null
  account: string | null
  comment: string | null
  power: '구매' | '판매'
  status: '승인' | '신청' | '삭제'
  request_time: string | null
  approve_id: string | null
  approve_time: string | null
  company_alias: string | null
  issue_ti: string | null
}

// Users
export interface User {
  user_id: string
  auth_uid: string | null
  user_name: string | null
  mobile_number: string | null
  company_id: string | null
  power: '대표' | '관리자' | '직원'
  status: '승인' | '신청' | '삭제'
  request_time: string | null
  approve_id: string | null
  approve_time: string | null
  email_address: string | null
}

// Customers
export interface Customer {
  seller_id: string
  customer_id: string
  company_id: string | null
  customer_name: string | null
  business_id: string | null
  owner_name: string | null
  phone_number: string | null
  fax_number: string | null
  email_address: string | null
  contact_name: string | null
  uptae: string | null
  jongmok: string | null
  address: string | null
  homepage: string | null
  account: string | null
  comment: string | null
  status: string | null
  register_id: string | null
  register_time: string | null
  last_modify_id: string | null
  last_modify_time: string | null
  level1: string | null
  level2: string | null
  level3: string | null
  payment: string | null
  issue_vat: string | null
}

// Orders (Master + Detail)
export interface OrderMaster { ... }
export interface OrderDetail { ... }

// Products
export interface Product { ... }

// Categories
export interface Category {
  category_id: string
  category_l: string | null
  category_m: string | null
  category_s: string | null
}

// TradingStubs
export interface TradingStubMaster { ... }
export interface TradingStubDetail { ... }

// Contracts
export interface Contract { ... }
```

### 권한 관련 타입
```typescript
export type CompanyPower = '구매' | '판매'
export type UserPower = '대표' | '관리자' | '직원'

export interface AuthUser {
  authUid: string
  userId: string
  userName: string
  mobileNumber: string
  emailAddress: string
  companyId: string
  companyName: string
  companyAlias: string
  companyPower: CompanyPower
  userPower: UserPower
}

// 등급 (가격 산정용)
export const PRICE_GRADES = [
  '3.8급', '3.9급', '4.0급', '4.1급', '4.2급',
  '4.3급', '4.4급', '4.5급', '4.6급', '4.7급',
  '4.8급', '4.9급', '5.0급'
] as const
export type PriceGrade = typeof PRICE_GRADES[number]

// 등급 → UnitPrice 컬럼 인덱스 매핑
export const GRADE_TO_PRICE_INDEX: Record<PriceGrade, number> = {
  '3.8급': 1, '3.9급': 2, '4.0급': 3, '4.1급': 4,
  '4.2급': 5, '4.3급': 6, '4.4급': 7, '4.5급': 8,
  '4.6급': 9, '4.7급': 10, '4.8급': 11, '4.9급': 12,
  '5.0급': 13,
}
```

## 상수 정의 (src/lib/constants.ts)

```typescript
// 주문 상태 (전체)
export const ORDER_STATUS = {
  // 맞춤품 전용 (기성품은 바로 '주문'으로 시작)
  QUOTE_REQUEST: '견적 요청',     // 맞춤품만
  QUOTE_RESPONSE: '견적 응답',    // 맞춤품만
  // 공통
  ORDERED: '주문',
  PARTIAL_READY: '일부 준비됨',
  ALL_READY: '전부 준비됨',
  READY: '준비됨',
  WAITING_STOCK: '입고 대기중',
  NO_STOCK: '재고없음',          // OrdersD 개별 품목 전용
  RECEIVED: '수령',
  FINISHED: '완료',
  // 취소 상태
  QUOTE_CANCELLED: '견적 취소',   // 맞춤품만
  ORDER_CANCELLED: '주문 취소',
  READY_CANCELLED: '준비됨 취소',
  RECEIVE_CANCELLED: '수령 취소',
  FINISH_CANCELLED: '완료 취소',
} as const

// 회사 권한
export const COMPANY_POWER = {
  BUYER: '구매',
  SELLER: '판매',
} as const

// 사용자 권한
export const USER_POWER = {
  OWNER: '대표',
  ADMIN: '관리자',
  STAFF: '직원',
} as const

// 승인 상태
export const APPROVAL_STATUS = {
  APPROVED: '승인',
  PENDING: '신청',
  DELETED: '삭제',
} as const

// 하드코딩 판매회사 (클론코딩용, 추후 범용화)
export const SELLER_COMPANIES = {
  PUNGWON: '00002',
  REGROUND: '00046',
} as const
```

## 권한 훅

### useCompanyPower
```typescript
// 현재 사용자의 회사가 판매/구매인지 판별
// 반환: { isSeller, isBuyer, companyPower }
```

### useUserPower
```typescript
// 현재 사용자의 역할(대표/관리자/직원) 판별
// 반환: { isOwner, isAdmin, isStaff, userPower }
```

### usePermission (복합 권한)
```typescript
// 특정 기능의 접근 가능 여부를 판별
// 실제 코드 분석 기반 (Main.aspx.cs, MyCompany.aspx.cs)
interface Permissions {
  // 회사 권한 (companies.power) 기반
  canCreateOrder: boolean       // 판매+구매 모두 가능
  canPrepareItems: boolean      // 판매만 (품목별 준비)
  canConfirmReceive: boolean    // 구매 (수령 확인) + 판매 (대리 수령)
  canConfirmPayment: boolean    // 판매만 (결제/완료 처리)
  canManageProducts: boolean    // 판매만
  canIssueTradingStub: boolean  // 판매만
  canAutoRefresh: boolean       // 판매만 (전광판 30초 자동 리프레시)

  // 사용자 권한 (users.power) 기반 — 판매+구매 공통 적용
  canViewCustomers: boolean     // 대표/관리자만 (직원 X)
  canSearchAllOrders: boolean   // 대표만 (관리자/직원은 거래처 선택 필수)
  canEditCompany: boolean       // 대표만
  canManageStaff: boolean       // 대표만 (직원 목록 조회/삭제)

  // 사용자 권한 — 판매회사 전용 추가 체크
  canViewAmountInList: boolean  // 판매+대표만 (그 외 ***** 마스킹)
  canActOnOthersOrder: boolean  // 판매+대표만 (관리자/직원은 자기 주문만)
}
```

## 공통 레이아웃

### Protected Layout (src/app/(protected)/layout.tsx)
```
┌─────────────────────────────────────────────┐
│ Header                                       │
│ [로고] [회사명]          [사용자명] [로그아웃] │
├──────┬──────────────────────────────────────┤
│ Side │ Main Content                          │
│ bar  │                                       │
│      │                                       │
│ 메인 │                                       │
│ 내회사│                                      │
│ 청구서│                                      │
│ 거래표│                                      │
│ ...  │                                       │
└──────┴──────────────────────────────────────┘
```

### 네비게이션 항목 (권한별)
| 메뉴 | 판매 | 구매 | 비고 |
|------|------|------|------|
| 메인 | O | O | |
| 내 회사 | O | O | |
| 청구서 | O | O | |
| 거래명세표 | O | O | |
| 전자세금계산서 | O | O | |
| 풍원 | O (00002만) | O (계약시) | 클론코딩 |
| 리그라운드 | O (00046만) | O (계약시) | 클론코딩 |

## 완료 체크리스트
- [ ] types.ts 전체 타입 정의
- [ ] constants.ts 상수 정의
- [ ] useAuth 훅 완성
- [ ] useCompanyPower 훅
- [ ] useUserPower 훅
- [ ] usePermission 훅
- [ ] Protected layout (Header + Sidebar)
- [ ] 반응형 레이아웃 (모바일 햄버거 메뉴)
