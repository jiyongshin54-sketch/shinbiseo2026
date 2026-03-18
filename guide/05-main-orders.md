# Step 4: 전광판 + 주문 조회/상세

## 개요
Main.aspx의 핵심 영역인 "전광판"을 클론코딩. 판매/구매 회사 모두의 주문 현황 대시보드.

## 전광판이란?
방산시장 도매상 앞에 놓인 전자 전광판 개념. 오늘의 주문들이 실시간으로 표시되고, 각 주문의 상태(주문→준비중→준비됨→수령)가 색상으로 구분됨. 판매회사 직원은 이 화면을 보면서 물건을 준비하고, 구매회사는 자기 주문이 준비되었는지 확인한 후 물건을 가지러 감.

## 원본 분석 (Main.aspx.cs)

### 전광판 데이터 조회

**기본 동작**: 본인 회사에 관련된 주문 중, 오늘 주문했거나 아직 완료되지 않은(활성 상태인) 건들을 보여주는 화면. 기성품/맞춤품 관계없이 모두 표시.

**판매회사:** `ShinbsDB.GetOrderMInfo(MyCompanyID, null, filter, sort, null)`
- seller_id = 내 회사 기준으로 직접 조회
- StatusKey 정렬: 견적(0) → 입고대기(1) → 주문(2) → 준비됨(3) → 수령(4) → 완료(5)

**판매회사 기본 필터 ("모든 상태"):**
```sql
M.OrderDate >= '{15일전}'
AND (
    M.Status = '주문'
    OR M.Status = '입고 대기중'
    OR (M.ReadyMade = '맞춤' AND M.Status LIKE '%준비됨')
    OR M.OrderDate = '{오늘}'    -- 오늘 건은 완료 포함 모든 상태 표시
)
```
> 핵심: 과거 건 중 '수령'/'완료' 상태는 숨기되, 오늘 건은 무조건 표시

**구매회사:** `ShinbsDB.GetBuyerOrderMInfo(BuyerID, filter, sort)`
- Contracts 테이블에서 buyer_id = 내 회사인 계약 조회
- 각 계약의 seller_id + customer_id로 OrdersM 조회
- StatusKey: 주문(1) → 준비됨(2) → 수령(3) → 완료(4)

**구매회사 기본 필터 ("모든 상태"):**
```sql
M.OrderDate >= '{15일전}'
AND (
    M.Status = '견적 요청'
    OR M.Status = '견적 응답'
    OR M.Status = '주문'
    OR M.Status = '입고 대기중'
    OR M.Status LIKE '%준비됨'
)
```
> 핵심: 활성 상태(주문~준비됨)만 표시. 수령/완료는 숨김. 오늘 날짜 예외 없음

### 색상 코딩 (todayGV_RowDataBound)
| 색상 | 조건 |
|------|------|
| YellowGreen | 견적 요청 / 견적 응답 |
| Yellow | 주문 + 기성품 |
| LightSkyBlue | 주문 + 맞춤품 |
| Silver | 재고 없음 + 기성품 |
| DarkOrange | 준비됨 + 기성품 |
| DeepPink | 준비됨 + 맞춤품 |

### 자동 리프레시 (판매회사만)
```javascript
// 기존: 30초 setInterval → 신BS메인B 클릭 → PostBack
if (DummyTB.value == "풍원 오늘의 거래")
  setInterval(() => { document.getElementById('신BS메인B').click(); }, 30000);
```
- 새 주문 감지: TotalOrderCountHF 비교 → 증가 시 Alarm.wav 재생
- 중단 버튼으로 비활성화 가능

### 전광판 필터
- **상품구분 DDL:** 전체 / 기성 / 맞춤 → `AND M.ReadyMade = '{선택값}'` 추가
- **상태 DDL:** 모든 상태 / 견적 / 주문 / 준비됨 / 수령 / 완료 등 → 각각 다른 필터
- **기간:** 15일 lookback (startDate = today - 15일)
- 기성품/맞춤품 관계없이 모두 표시 (기본값 "전체")

### 주문 목록 컬럼
**판매회사 뷰:**
```
거래일자 | 거래처명 | 구분(기성/맞춤) | 품목수 | 금액 | 조정 | 부가세 | 합계 | 상태 | 결제방식 | 비고 | 주문자
```

**구매회사 뷰:**
```
거래일자 | 판매회사 | 구분 | 품목수 | 금액 | 조정 | 부가세 | 합계 | 상태 | 비고
```

---

## 주문 상세 조회 + 품목별 처리

### 전광판에서 주문 클릭 시 (거래현황보기B_Click)
1. 선택한 주문의 OrdersD 상세 품목 표시
2. 기성품/맞춤품에 따라 다른 GridView 사용
3. 판매회사에게만 액션 버튼 표시

### 기성품 상세 컬럼
```
순번 | 품명 | 색깔 | 두께 | 사이즈 | 단가 | 수량 | 금액 | 묶음 | 상태 | [준비] [재고없음]
```

### 맞춤품 상세 컬럼
```
순번 | 품명 | 색깔 | 두께 | 폭×길이 | 인쇄명 | 도수 | 가공방식 | 단가 | 수량 | 금액 | 상태 | [준비] [재고없음]
```

### 품목별 준비 프로세스 (판매회사)
```
[준비] 클릭 → ShinbsDB.SetOrderDetailStatus(SellerID, OrderID, Sequence, UserID, "준비됨")
  ↓ DB 응답
  ├─ "일부 준비됨" → 전광판 상태 업데이트, 상세 새로고침
  ├─ "전부 준비됨" / "준비됨" → 마스터 상태 변경, 합계 재계산
  └─ 재고없음 품목 있으면 → 새 주문(입고 대기중)으로 자동 분리

[재고없음] 클릭 → 해당 품목 Status = '재고없음'
  → 남은 준비됨 품목만으로 합계 재계산
  → 재고없음 품목은 별도 주문서(Status='입고 대기중')로 자동 생성
```

### 주문 상태 변경 버튼 (상태에 따라 표시)
| 현재 상태 | 판매회사 버튼 | 구매회사 버튼 | 비고 |
|----------|-------------|-------------|------|
| 주문 | [상세보기+품목준비] | [상세보기] | 기성+맞춤 |
| 일부/전부 준비됨 | [대리 수령] | [수령 확인] | 기성+맞춤 |
| 수령 | [결제 확인(현금/수금/이체/카드)] | - | 기성+맞춤 |
| 견적 요청 | [견적 응답] [견적 취소] | [견적 취소] | **맞춤품만** |
| 견적 응답 | - | [주문 확정] [견적 취소] | **맞춤품만** |

> ※ 견적 요청/견적 응답 상태는 맞춤품(ReadyMade='맞춤')에만 해당
> 기성품은 바로 "주문" 상태로 시작됨

### Users.Power에 따른 전광판 제약 (판매+구매 공통)
| 항목 | 대표 | 관리자 | 직원 |
|------|------|--------|------|
| 전광판 조회 | 전체 | 전체 | 전체 (단, 금액 마스킹 - 판매회사) |
| 금액 컬럼 (판매회사) | 숫자 표시 | ***** 마스킹 | ***** 마스킹 |
| 금액 컬럼 (구매회사) | 숫자 표시 | 숫자 표시 | 숫자 표시 |
| 타인 주문 액션 (판매회사) | O | X (자기 것만) | X (자기 것만) |
| 주문 전체 검색 | O | X (거래처 선택 필수) | X (거래처 선택 필수) |

### 완료 처리 단축 (판매회사)
판매회사는 한번에 처리 가능:
```
모든 품목 준비됨 처리 → 대리 수령 → 결제 완료 (결제방식 선택)
```

### 일괄 처리 (판매회사 대표/관리자)
- 일괄 대리 수령: 체크된 주문들 한번에 수령 처리
- 일괄 결제: 체크된 주문들 한번에 완료 처리

---

## API 설계

### GET /api/orders
```typescript
// 판매회사: ?seller_id=xxx&date_from=xxx&date_to=xxx&status=xxx&ready_made=xxx
// 구매회사: ?buyer_id=xxx&date_from=xxx&date_to=xxx&status=xxx

// 구매회사의 경우 내부적으로:
// 1. contracts에서 buyer_id로 seller_id + customer_id 조회
// 2. 각 계약별 orders_m 조회하여 합산

// Response: OrderMaster[] (+ 거래처명, 주문자명 JOIN)
```

### GET /api/orders/[orderId]/details
```typescript
// Query: seller_id
// Response: OrderDetail[] (+ category 정보 JOIN)
```

### PATCH /api/orders/[orderId]/status
```typescript
// Body: { seller_id, new_status, user_id, payment_method?, remark?, order_date? }
// 상태 전이 규칙 검증 후 처리
```

### PATCH /api/orders/[orderId]/details/[sequence]/status
```typescript
// Body: { seller_id, status, user_id, order_date }
// 개별 품목 준비/재고없음 처리
// 자동으로 마스터 상태 재계산 + 재고없음 분리 주문 생성
```

### POST /api/orders/batch-status
```typescript
// Body: { order_ids: string[], new_status, user_id, payment_method? }
// 일괄 수령/결제 처리
```

---

## 컴포넌트 구조

```
/main/page.tsx
├── DisplayBoard (전광판)
│   ├── DisplayBoardFilters
│   │   ├── ReadyMadeFilter (전체/기성/맞춤)
│   │   ├── StatusFilter (상태 드롭다운)
│   │   └── AutoRefreshToggle (판매회사만)
│   ├── OrderTable (주문 목록, 색상 코딩)
│   │   └── OrderRow (클릭 → 상세 열기)
│   ├── OrderDetailPanel (선택한 주문의 품목 상세)
│   │   ├── ReadyMadeDetailTable (기성품)
│   │   └── CustomDetailTable (맞춤품)
│   ├── ItemActionButtons (판매: 준비/재고없음)
│   └── OrderActionButtons (상태 변경 버튼)
├── NewOrderAlarm (새 주문 알림 + 사운드)
└── BatchActionBar (일괄 처리 바)
```

## Next.js 구현 포인트

### 자동 리프레시 → SWR / React Query
```typescript
// 판매회사: 30초 간격 polling
const { data: orders, mutate } = useSWR(
  '/api/orders?seller_id=xxx',
  fetcher,
  { refreshInterval: isSeller ? 30000 : 0 }
)
```

### 새 주문 알림
```typescript
// 이전 건수와 비교하여 새 주문 감지
useEffect(() => {
  if (orders.length > prevCount) {
    new Audio('/alarm.wav').play()
    toast('새 주문이 들어왔습니다!')
  }
}, [orders.length])
```

### 색상 코딩
```typescript
function getRowColor(status: string, readyMade: string): string {
  if (status.includes('견적')) return 'bg-lime-200'
  if (status === '주문' && readyMade === '기성') return 'bg-yellow-200'
  if (status === '주문' && readyMade === '맞춤') return 'bg-sky-200'
  if (status === '재고없음') return 'bg-gray-300'
  if (status.includes('준비됨') && readyMade === '기성') return 'bg-orange-400'
  if (status.includes('준비됨') && readyMade === '맞춤') return 'bg-pink-500'
  return ''
}
```

## 완료 체크리스트
- [ ] GET /api/orders (판매/구매 분기)
- [ ] GET /api/orders/[id]/details
- [ ] PATCH /api/orders/[id]/status (상태 전이 규칙)
- [ ] PATCH /api/orders/[id]/details/[seq]/status (품목별 준비)
- [ ] POST /api/orders/batch-status (일괄 처리)
- [ ] 전광판 테이블 (색상 코딩)
- [ ] 전광판 필터 (구분/상태)
- [ ] 자동 리프레시 + 새 주문 알림 (판매회사)
- [ ] 주문 상세 패널 (기성/맞춤 분리)
- [ ] 품목별 준비/재고없음 처리
- [ ] 재고없음 → 별도 주문 자동 분리
- [ ] 상태별 액션 버튼 (판매/구매 분기)
- [ ] 완료 처리 단축 (판매회사)
- [ ] 일괄 처리 (대리 수령/결제)
- [ ] 권한별 컬럼/금액 표시 제어
