# 신비서(ShinBiSeo) .NET WebForms → Next.js + Supabase 전환 마스터 플랜

## 프로젝트 개요
- **프로젝트명:** 신비서 2026 (shinbiseo2026)
- **원본:** ASP.NET WebForms (D:\신지용\AWS Renewal\2026\AppRoot\new.shinbiseo.com\)
- **DB 백업:** D:\신지용\AWS Renewal\2026\DB20251129\
- **개발 폴더:** D:\신지용\shinbiseo2026\
- **기술 스택:** Next.js 15 (App Router) + Supabase + Tailwind CSS + shadcn/ui
- **배포:** Vercel + Supabase Cloud
- **인증:** Supabase Auth (Google OAuth Provider)

## 개발 단계 요약

| Step | 작업 | 가이드 파일 | 상태 |
|------|------|------------|------|
| 0 | 프로젝트 초기 설정 | `01-project-setup.md` | ⬜ |
| 1 | DB 스키마 (PostgreSQL) + RLS | `02-database-schema.md` | ⬜ |
| 2 | 인증 시스템 | `03-authentication.md` | ⬜ |
| 3 | 타입 정의 + 권한 훅 + 레이아웃 | `04-types-and-layout.md` | ⬜ |
| 4 | 전광판 + 주문 조회 | `05-main-orders.md` | ⬜ |
| 5 | 기성품 주문 (장바구니 + 가격 산정) | `06-cart-and-new-order.md` | ⬜ |
| 5-1 | 맞춤품 주문 (가격 산정 공식) | `06-1-custom-order.md` | ⬜ |
| 6 | 고객관리 (판매+구매 공통) | `07-customer-management.md` | ⬜ |
| 7 | 회사 설정 (MyCompany) | `08-my-company.md` | ⬜ |
| 8 | 풍원 전용 모듈 | `09-pungwon-module.md` | ⬜ |
| 9 | 리그라운드 전용 모듈 | `10-reground-module.md` | ⬜ |
| 10 | 청구서/거래명세표/전자세금계산서 | `11-billing-trading-stubs.md` | ⬜ |
| 11 | 데이터 마이그레이션 | `12-data-migration.md` | ⬜ |
| 12 | Vercel 배포 + 도메인 설정 | `13-deployment.md` | ⬜ |

---

## 핵심 비즈니스 모델

### 방산시장 B2B 도매 거래 구조
```
[판매회사(도매상)] ←──── 물건 구매 ────→ [구매회사(소매/중간상)]
      풍원(00002)                         다수의 구매회사
      리그라운드(00046)                    (이 사람들도 최종 소비자에게 판매)
```
- **판매회사**: 포장자재 도매상. 기성품/맞춤품을 판매
- **구매회사**: 판매회사로부터 물건을 사서 다시 파는 중간 유통상. 자신만의 거래처가 있음
- 양쪽 모두 주문을 생성할 수 있고, 양쪽 모두 고객(거래처)을 관리할 수 있음

### Companies vs Customers 관계
- **Companies**: 신비서에 가입한 모든 회사 (Power: '구매' 또는 '판매')
- **Customers**: 특정 회사 입장에서의 고객 목록 (SellerID 기준 스코핑)
  - 판매회사의 Customers = 자사에서 물건을 사가는 구매회사들
  - 구매회사도 자체 Customers를 관리할 수 있음 (자기 거래처)
- Customers.CompanyID가 있으면 → 신비서 가입 회사
- Customers.CompanyID가 없으면 → 신비서 미가입 고객 (수동 등록)
- **Contracts**: 판매-구매 간 거래 관계 매핑 (SellerID + BuyerID → CustomerID)

---

## 권한 체계

### 회사 권한 (companies.power)
| 기능 | 판매회사 | 구매회사 |
|------|---------|---------|
| 주문 생성 | O (장부 등록, 견적 등록) | O (기성품/맞춤품 주문) |
| 전광판 조회 | O (30초 자동 리프레시+알람) | O (수동 리프레시) |
| 상품 준비 (개별 품목) | O | X |
| 수령 확인 | O (대리 수령) | O |
| 결제/완료 처리 | O | X |
| 고객관리 | O | O (자체 거래처) |
| 제품관리 | O | X |
| 거래명세표 발행 | O | X |
| 거래명세표 조회 | O | O |

### 사용자 권한 (users.power) — 판매/구매 공통 적용
Users.Power(대표/관리자/직원)는 판매회사와 구매회사 모두에게 적용되며, 아래와 같은 차이가 있음.

**판매+구매 공통 체크 (6곳):**
| 기능 | 대표 | 관리자 | 직원 |
|------|------|--------|------|
| 거래처(고객) 목록 조회 | O | O | X ("거래처는 대표와 관리자만 볼 수 있습니다") |
| 주문 전체 검색 (거래처 무관) | O | X (거래처 선택 필수) | X (거래처 선택 필수) |
| 회사 정보 수정 버튼 | O | X | X |
| 직원 목록 조회 | O | X | X |
| 직원 삭제 버튼 | O | X | X |

**판매회사 전용 체크 (2곳):**
| 기능 | 대표 | 관리자/직원 |
|------|------|-----------|
| 주문 목록 금액 표시 | O (숫자) | X ("*****" 마스킹) |
| 타인 주문 액션 버튼 | O | X (자기 주문만) |

---

## 주문 상태 흐름 (State Machine)

### 기성품 흐름 (견적 과정 없음)
```
주문 → [개별 품목 준비] → 준비됨 → 수령 → 완료
              ↓
       일부 준비됨 (일부만 준비)
       전부 준비됨 (전부 준비 완료)
       입고 대기중 (재고 없는 품목 → 별도 주문 자동 분리)
```

### 맞춤품 흐름 (견적 과정 포함)
```
견적 요청 → 견적 응답 → 주문 → [개별 품목 준비] → 준비됨 → 수령 → 완료
```
> ※ 견적 요청/견적 응답은 **맞춤품(ReadyMade='맞춤')에만 해당**
> 기성품은 바로 "주문" 상태로 시작됨

### 상태 전이 규칙 (SetOrderMStatus)
| 새 상태 | 허용되는 이전 상태 |
|---------|-------------------|
| 준비됨 | 주문, 입고 대기중 |
| 수령 | 준비됨, 일부 준비됨, 전부 준비됨 |
| 완료 | 수령 |
| 견적 취소 | 견적 요청, 견적 응답 *(맞춤품만)* |
| 주문 취소 | 주문, 입고 대기중 |
| 준비됨 취소 | 준비됨, 전부 준비됨, 일부 준비됨 |
| 수령 취소 | 수령 |
| 완료 취소 | 완료 |

### 개별 품목 준비 프로세스 (핵심)
```
주문 접수 (모든 품목 Status='')
  ↓ 판매회사가 품목 하나씩 "준비" 클릭
OrdersD 개별 행 Status → '준비됨' 또는 '재고없음'
  ↓ 시스템 자동 판단
  ├─ 아직 미처리 품목 있음 → OrdersM Status = '일부 준비됨'
  ├─ 모든 품목 처리 완료 → OrdersM Status = '전부 준비됨' / '준비됨'
  └─ '재고없음' 품목 있으면 → 별도 주문(입고 대기중)으로 자동 분리
```

### 완료 처리 단축 (판매회사)
판매회사는 "완료 처리" 버튼으로 한번에 처리 가능:
```
모든 품목 준비됨 → 대리 수령 → 결제 완료 (현금/수금/이체/카드)
```

---

## 전광판 (Display Board)

메인 화면의 핵심 영역. 주문 현황을 실시간으로 보여주는 대시보드.

### 색상 코딩
| 색상 | 의미 |
|------|------|
| 🟡 YellowGreen | 견적 관련 (견적 요청/응답) |
| 🟨 Yellow | 주문 + 기성품 |
| 🔵 LightSkyBlue | 주문 + 맞춤품 |
| ⚪ Silver | 재고 없음 + 기성품 |
| 🟠 DarkOrange | 준비됨 + 기성품 |
| 🔴 DeepPink | 준비됨 + 맞춤품 |

### 자동 리프레시 (판매회사만)
- 30초 간격 자동 새로고침
- 새 주문 감지 시 알람 사운드(Alarm.wav) 재생
- 중단 버튼으로 자동 리프레시 끄기 가능

---

## 가격 산정 체계

### 기성품 가격 (Level → UnitPrice 매핑)
Customers 테이블의 Level1(일반가), Level2(마대가) → Products 테이블의 UnitPrice01~13

| 등급 | Products 컬럼 |
|------|--------------|
| 3.8급 | UnitPrice01 |
| 3.9급 | UnitPrice02 |
| 4.0급 | UnitPrice03 |
| 4.1급 | UnitPrice04 |
| 4.2급 | UnitPrice05 |
| 4.3급 | UnitPrice06 |
| 4.4급 | UnitPrice07 |
| 4.5급 | UnitPrice08 |
| 4.6급 | UnitPrice09 |
| 4.7급 | UnitPrice10 |
| 4.8급 | UnitPrice11 |
| 4.9급 | UnitPrice12 |
| 5.0급 | UnitPrice13 |

**가격 선택 로직:**
```
if (주문수량 < 마대기준수량)  → Level1(일반가) 등급의 UnitPrice 적용
if (주문수량 >= 마대기준수량) → Level2(마대가) 등급의 UnitPrice 적용
```
- 마대기준수량 = Products.Attribute05 값
- 수량은 내부적으로 ×100 처리됨

### 맞춤품 가격 공식
```
단가 = Round(ValueA + ValueB, 1)

ValueA (재료비) = 두께 × 폭 × (길이 + 5.0) × 0.184 × 등급상수
ValueB (인쇄비) = 도수값 == 0 ? 0 : max((도수값 × 8000 × 폭) / 45700, 2.0)

등급상수 = Level 값에서 "급" 제거한 숫자 (예: "3.8급" → 3.8)
```

**도수(인쇄 색상 수) 매핑:**
| 선택값 | 도수값 |
|-------|--------|
| 무지/없음 | 0 |
| 1도 | 1 |
| 2도 | 2 |
| 3도 | 3 |
| 양면 1도 | 2 |
| 양면 2도 | 4 |
| 양면 3도 | 6 |

---

## CartTable 컬럼 구조 (세션 장바구니)

| 컬럼 | 기성품 | 맞춤품 |
|------|--------|--------|
| Sequence | 순번 | 순번 |
| ProductID | 상품ID | (없음) |
| CategoryID | 카테고리 | 카테고리 |
| Attribute01 | 품명 | 품명 |
| Attribute02 | 색깔 | 색깔 |
| Attribute03 | 두께 | 두께 |
| Attribute04 | 사이즈 | 폭×길이 |
| Attribute05 | 마대수량 | **인쇄명** |
| Attribute06 | - | **도수** |
| Attribute07 | - | **가공방식** |
| Attribute08 | - | **도안명** |
| Attribute10 | CategoryS | CategoryS |
| Price | 단가 | 단가 |
| Quantity | 수량(×100) | 수량 |
| Amount | 금액 | 금액 |
| Group | 묶음 | 묶음 |

---

## ID 체계
- **CompanyID:** varchar(5), zero-padded ('00001'~)
- **CustomerID:** varchar(5), 회사별 독립 채번
- **UserID:** char(21), Google OAuth numeric ID → Supabase auth_uid(UUID) 추가
- **OrderID:** varchar(18), `DateTime.Now.Ticks.ToString()` (타임스탬프 기반)
- **TsID:** varchar(18), 동일 방식
- **ProductID:** varchar(5), 판매회사별 독립 채번

## 핵심 참조 파일 (기존 코드)

| 파일 | 용도 | 클론 대상 |
|------|------|----------|
| `App_Code/ShinbsDB.cs` | DB 접근 레이어 전체 | API Routes |
| `App_Code/Shinbs.cs` | 비즈니스 로직 (XML 주문 등) | API Routes |
| `Main.aspx` + `Main.aspx.cs` | 전광판+주문+고객관리+거래명세 | /main |
| `Default.aspx.cs` | 인증 후 세션/CartTable 초기화 | /auth/callback |
| `FirstLogin.aspx.cs` | 온보딩 로직 | /first-login |
| `MyCompany.aspx.cs` | 회사 설정 | /my-company |
| `Pungwon.aspx.cs` | 풍원 모듈 (기성 주문은 Main으로 이관됨) | /pungwon |
| `Reground.aspx.cs` | 리그라운드 모듈 | /reground |
| `Billing.aspx.cs` | 청구서 + 미수금 | /billing |
| `TradingStubPrint.aspx.cs` | 거래명세표 인쇄 | /trading-stub-print |
| `eTaxBill.aspx.cs` | 전자세금계산서 | /e-tax-bill |
