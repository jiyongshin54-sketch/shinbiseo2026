# Step 3: 타입 정의 + 권한 체계 + 레이아웃 (소스 분석 기준)

## 권한 체계 상세 (Main.aspx.cs 소스 분석)

### Session 변수 → Supabase Auth 매핑
| Session 변수 | 용도 | Next.js 대체 |
|---|---|---|
| Session["MyID"] | Google ID (21자리) | useAuth().userInfo.userId |
| Session["MyCompanyID"] | 회사 ID | useAuth().userInfo.companyId |
| Session["MyName"] | 사용자 이름 | useAuth().userInfo.userName |
| Session["MyPower"] | 직위 (대표/관리자/직원) | useAuth().userInfo.userPower |
| Session["MyStatus"] | 승인 상태 | useAuth().userInfo.status |
| Session["CartTable"] | 장바구니 DataTable | useCartStore() (zustand) |

### 판매/구매 판별
- **회사의 Power 필드**로 결정 (사용자 Power 아님!)
- `ShinbsDB.GetCompanyFieldName(companyId, "Power")` = "판매" 또는 "구매"
- useAuth().userInfo.companyPower로 접근

---

## 권한별 기능 접근 매트릭스 (Main.aspx.cs 분석 결과)

### 전광판 (todayGV)
| 기능 | 판매-대표 | 판매-관리자 | 판매-직원 | 구매-대표 | 구매-관리자 | 구매-직원 |
|---|---|---|---|---|---|---|
| 전광판 조회 | O | O | O | O | O | O |
| **금액 컬럼** | **실제 금액** | **\*\*\*\*\*** | **\*\*\*\*\*** | **실제 금액** | **실제 금액** | **실제 금액** |
| 명세표 발행 버튼 | O | O | O | X (숨김) | X (숨김) | X (숨김) |
| 자동Refresh 버튼 | O | O | O | X (숨김) | X (숨김) | X (숨김) |
| 새 주문 알림(Alarm) | O | O | O | X | X | X |

> **핵심**: 금액 마스킹은 "판매회사 + 대표가 아닌 경우"만! 구매회사는 직위 무관 금액 표시.

### 전광판 상세 (거래현황DetailPH)
| 기능 | 판매 | 구매 |
|---|---|---|
| 거래일자 수정 | O (Enabled) | X (Disabled) |
| 품목별 준비/재고없음 버튼 | O | X (Disabled) |
| 수령 확인 | X | O |
| 대리 수령 확인 | O (판매사만) | X |
| 결제 확인 | O (판매사만) | X |
| 주문 취소 | 본인 주문만 | X |

### 거래처 관리
| 기능 | 대표 | 관리자 | 직원 |
|---|---|---|---|
| 거래처 목록 조회 | O | O | X ("대표/관리자만 볼 수 있습니다") |
| 거래처 상세 수정 | O | O | X |
| 미수금 관리 패널 | O (판매만) | O (판매만) | O (판매만) |

> **핵심**: 구매회사는 미수금 패널이 숨겨짐 (미수금은 판매사 기능)

### 거래명세표/세금계산서 관리
| 기능 | 판매 | 구매 |
|---|---|---|
| 거래처 관리 | O | O (구매 입장의 거래처 관리) |
| 거래명세표 관리 | O | O (구매 입장의 명세표 관리) |
| 세금계산서 관리 | O | O (구매 입장의 세금계산서 관리) |

### 주문 관리 (검색)
| 기능 | 대표 | 관리자/직원 |
|---|---|---|
| 거래처 미선택 전체조회 | O | X (거래처 필수) |
| [수정] 버튼 | O (모든 주문) | 본인 주문만 |
| 일괄 확인(결제) | O (판매만) | O (판매만) |

### 기성품/맞춤품 주문
| 기능 | 판매 | 구매 |
|---|---|---|
| 구분 DDL | 판매/구매 선택 가능 | "구매" 고정 (readonly) |
| 거래일자 수정 | O | X (readonly) |
| 금액조정 수정 | O | X (readonly) |
| 상태 DDL | O (주문/견적/준비됨 등) | X (숨김) |
| 주문 등록 | O | O |
| 주문 수정 | O | X |

### 우리 회사 관리
| 기능 | 대표 | 관리자 | 직원 |
|---|---|---|---|
| 회사정보 조회 | O | O | O |
| 회사정보 수정 | O | X (수정 버튼 숨김) | X |
| 직원 목록 | O | X (빈 목록) | X (빈 목록) |
| 직원 승인/삭제 | O | X | X |

### 풍원 딜러네트워크
| 기능 | 풍원 소속 | 계약 구매회사 |
|---|---|---|
| 기성품 주문 | O | O |
| 맞춤품 주문 | O | O (견적요청만) |
| 기성품 단가표 | 전체 13등급 단가 | 자기 등급 단가만 |
| 상품 관리 (풍원상품PH) | O | X (숨김) |

---

## 구매회사 관점에서의 핵심 차이

구매회사는 판매회사에 비해:

1. **전광판**: 자동Refresh 없음, 명세표 발행 버튼 없음, 금액은 항상 표시
2. **거래처 관리**: 미수금 패널 숨김 (미수금은 판매사가 관리)
3. **거래명세표/세금계산서**: 구매 입장에서도 관리 가능 (판매사와 동일 메뉴 접근)
4. **주문**: 구분 DDL이 "구매" 고정, 거래일자/금액조정 수정 불가, 상태 DDL 숨김
5. **주문 상세**: 준비/재고없음 불가, 대신 수령 확인 가능
6. **풍원/오픈패키지**: 딜러네트워크에서 직접 기성품 주문 + 견적 요청 가능

---

## 특수 사용자
- `ShinbsDB.ShinID` / `ShinbsDB.WonID`: 시스템 관리자
  - Main 화면에 "새 회사 승인" (ShinBSPH) 패널 표시
  - 가입 회사 승인/삭제, 전체 직원 관리
  - → 나중에 별도 관리자 페이지로 구현 예정

---

## TypeScript 타입 정의 (src/lib/types.ts)

### Company
```typescript
interface Company {
  company_id: string       // varchar(5), zero-padded
  company_name: string
  business_id: string      // 사업자번호
  owner_name: string
  phone_number: string
  fax_number: string
  email_address: string
  contact_id: string       // Google ID (연락 담당자)
  uptae: string            // 업태
  jongmok: string          // 종목
  address: string
  homepage: string
  account: string          // 계좌정보
  comment: string
  power: '판매' | '구매'
  status: '승인' | '신청'
  request_time: string
  approve_id: string
  approve_time: string
  company_alias: string
  issue_ti: string | null  // '발행' | null
}
```

### User
```typescript
interface User {
  user_id: string          // Google ID (21자리)
  auth_uid: string         // Supabase UUID
  user_name: string
  mobile_number: string
  company_id: string
  power: '대표' | '관리자' | '직원'
  status: '승인' | '신청' | '삭제'
  request_time: string
  approve_id: string
  approve_time: string
  email_address: string
}
```

### Customer
```typescript
interface Customer {
  seller_id: string
  customer_id: string
  company_id: string       // Companies 매핑 (가입시)
  customer_name: string
  business_id: string
  owner_name: string
  phone_number: string
  fax_number: string
  email_address: string
  contact_name: string
  uptae: string
  jongmok: string
  address: string
  homepage: string
  account: string
  comment: string
  status: string
  level1: string           // 일반등급 (3.8급~5.0급)
  level2: string           // 마대등급
  level3: string           // 맞춤품 등급
  payment: string          // 결제방식 (일결제/월결제)
  issue_vat: string        // 세금계산서 (발행/미발행)
}
```

### OrderMaster / OrderDetail / Product / Category 등
(기존 types.ts 참조)

---

## 공통 레이아웃 (Protected Layout)

### 헤더
```
[로고] 신BS - 포장자재 온라인 도매시장          회사명(권한)
```
- 배경: cornflowerblue
- 로고: shinbs.jpg, 높이 62px
- 타이틀: font-size:25px, color:white, font-weight:bold
- 우측: whoami 라벨 (회사명+권한), color:silver

### 메뉴 탭 (8개)
```
Main 화면 | 거래처 관리 | 거래명세표 관리 | 세금계산서 관리 | 주문 관리 | 기성품 주문 | 맞춤품 주문 | 우리 회사 관리
```
- 배경: whitesmoke
- 테두리: cornflowerblue solid thin
- 텍스트: darkslateblue
- 각 탭: width:10%, text-align:center
- 그룹 구분선: 거래처관리 앞, 주문관리 앞, 우리회사 앞에 border-left

### 콘텐츠
- max-width: 1500px, margin:auto
- padding: 적절한 여백
