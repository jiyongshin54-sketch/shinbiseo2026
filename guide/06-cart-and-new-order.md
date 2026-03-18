# Step 5: 기성품 주문 (장바구니 + 가격 산정)

## 개요
기성품(Products 테이블에 등록된 기존 상품)을 주문하는 플로우. 판매/구매 회사 모두 주문 가능하나 방식이 다름.

> **중요**: 기성품은 견적 과정(견적 요청/견적 응답) 없이 바로 **"주문"** 상태로 시작됨.
> 견적 플로우는 맞춤품에만 해당 (06-1-custom-order.md 참조).

## 주문 주체별 차이

### 구매회사의 기성품 주문
1. 판매회사 선택 (계약된 판매회사 드롭다운, 기본=풍원)
2. 사전 체크: `IsCustomer()` - 해당 판매회사의 고객으로 등록되어 있는지
3. 사전 체크: `CheckOrderEnable()` - 미수령 주문이 없는지 (수령하고 재주문 정책)
4. 상품 검색 → 장바구니 추가 → 주문 제출 (Status = "주문")
5. **구매회사는 "주문" 상태로만 제출 가능** (상태 DDL 비활성화)

### 판매회사의 장부 등록
1. 고객(거래처) 선택
2. 상품 검색 → 장바구니 추가 → 주문 등록
3. 상태 선택 가능: "견적 요청", "견적 등록", "주문 등록", "신규주문"
4. **판매회사는 구매회사 대신 장부처럼 주문을 등록할 수 있음**

---

## 기성품 가격 산정 체계 ★

### Level → UnitPrice 매핑
Customers 테이블의 고객별 등급(Level1=일반가, Level2=마대가)에 따라 Products의 가격 컬럼 결정.

**SQL (ShinbsDB.GetProductInfo, line 664-667):**
```sql
SELECT ...,
  CASE Level1
    WHEN '3.8급' THEN UnitPrice01
    WHEN '3.9급' THEN UnitPrice02
    WHEN '4.0급' THEN UnitPrice03
    WHEN '4.1급' THEN UnitPrice04
    WHEN '4.2급' THEN UnitPrice05
    WHEN '4.3급' THEN UnitPrice06
    WHEN '4.4급' THEN UnitPrice07
    WHEN '4.5급' THEN UnitPrice08
    WHEN '4.6급' THEN UnitPrice09
    WHEN '4.7급' THEN UnitPrice10
    WHEN '4.8급' THEN UnitPrice11
    WHEN '4.9급' THEN UnitPrice12
    WHEN '5.0급' THEN UnitPrice13
  END AS UnitPrice1,  -- 일반가
  CASE Level2
    WHEN '3.8급' THEN UnitPrice01
    ... (동일 매핑)
  END AS UnitPrice2   -- 마대가
FROM Products P
JOIN Customers C ON ...
```

### 마대 기준 가격 선택
```
마대기준수량 = Products.Attribute05 (마대 컬럼)

if (주문수량 < 마대기준수량):
    적용단가 = UnitPrice1 (Level1 기반, 일반가)
else:
    적용단가 = UnitPrice2 (Level2 기반, 마대가 = 대량할인)
```

### 수량 처리
- 사용자 입력 수량 × 100 = 실제 수량 (내부 단위)
- 마대기준수량도 같은 ×100 단위

---

## 기성품 주문 플로우

### Step 1: 고객/판매회사 선택
```
판매회사 → 고객 드롭다운 표시 (Customers 목록)
구매회사 → 판매회사 드롭다운 표시 (계약된 Companies 목록)
```

### Step 2: 상품 검색
```
ShinbsDB.GetProductInfo(SellerID, BuyerID, null, Filter, "ProductID")
- Filter: 키워드 검색 (사이즈, 품명, 색깔)
- BuyerID: 구매회사 ID → Level1/Level2 조회하여 가격 산출
```

**검색 결과 표시:**
```
품명 | 색깔 | 두께 | 사이즈 | 마대기준 | Level1가격 | Level2가격 | [수량 입력]
```

### Step 3: 수량 입력 → 장바구니 추가 (수량TB_TextChanged)
```
1. 수량 입력 (사용자 → ×100 변환)
2. abs(수량)과 마대기준수량 비교
3. 적용 단가 결정 (Level1 or Level2)
4. 금액 = 수량 × 단가
5. Session["CartTable"]에 행 추가
```

### Step 4: 장바구니 관리
```
CartTable GridView:
순번 | 품명 | 색깔 | 두께 | 사이즈 | 단가 | 수량 | 금액 | 묶음 | [삭제]

하단 합계:
- 공급가 합계 (SumAmount)
- 합계 조정 (Adjustment) - +/- 선택 가능
- 부가가치세 (VAT) - 0% 또는 10%
- 주문 총계 (TotalAmount)
```

### Step 5: 주문 제출 (기성주문B_Click)
```typescript
ShinbsDB.MakeNewOrder(
  SellerID,
  OrderDate,           // YYYY.MM.DD
  CustomerID,
  "기성",              // ReadyMade
  ItemCount,
  SumAmount,
  Adjustment,
  VAT,
  TotalAmount,
  PaymentMethod,
  PaymentDate,
  Comment,
  Status,              // 구매: "주문" 고정, 판매: 선택 가능
  OrdererID,
  CartDataTable        // OrdersD 데이터
)
```

---

## 장바구니 Store (zustand)

```typescript
// src/stores/cart-store.ts
interface CartItem {
  sequence: number
  productId: string           // 기성품 ID (맞춤은 '')
  categoryId: string
  attribute01: string         // 품명
  attribute02: string         // 색깔
  attribute03: string         // 두께
  attribute04: string         // 사이즈 (기성) / 폭×길이 (맞춤)
  attribute05: string         // 마대수량 (기성) / 인쇄명 (맞춤)
  attribute06: string         // - (기성) / 도수 (맞춤)
  attribute07: string         // - (기성) / 가공방식 (맞춤)
  attribute08: string         // - (기성) / 도안명 (맞춤)
  attribute10: string         // CategoryS
  price: number               // 적용 단가
  quantity: number            // 수량 (기성: ×100)
  amount: number              // 금액
  group: string               // 묶음
}

interface CartStore {
  items: CartItem[]
  sellerId: string | null
  customerId: string | null
  customerName: string | null
  readyMade: '기성' | '맞춤'
  orderDate: string            // YYYY.MM.DD
  comment: string
  adjustment: number
  adjustmentSign: '+' | '-'
  vatRate: 0 | 10              // 0% or 10%

  // Actions
  addItem(item: CartItem): void
  removeItem(sequence: number): void
  updateItem(sequence: number, updates: Partial<CartItem>): void
  setSeller(id: string): void
  setCustomer(id: string, name: string): void
  clearCart(): void

  // Computed
  sumAmount: number            // 공급가 합계
  vatAmount: number            // 부가세
  totalAmount: number          // 총계
}
```

## API 설계

### POST /api/orders
```typescript
// Request:
{
  seller_id: string,
  order_date: string,
  customer_id: string,
  ready_made: '기성' | '맞춤',
  item_count: number,
  sum_amount: number,
  adjustment: number,
  vat: number,
  total_amount: number,
  payment_method: string,
  payment_date: string,
  comment: string,
  status: string,
  orderer_id: string,
  items: OrderDetailItem[]
}

// order_id 생성: DateTime.Now.Ticks 호환
// OrdersM INSERT + OrdersD INSERT (트랜잭션)
// 리그라운드(00046)인 경우 재고 차감 (modifyProductStock)
```

### OrderID 생성
```typescript
// .NET Ticks 호환: 100나노초 단위, 0001-01-01부터
// JavaScript 호환 방식:
function generateOrderId(): string {
  const ticksPerMs = 10000n
  const epochOffset = 621355968000000000n // .NET epoch offset
  const ticks = BigInt(Date.now()) * ticksPerMs + epochOffset
  return ticks.toString()
}
```

---

## 컴포넌트 구조

```
기성품 주문 화면 (Main 내 탭 또는 패널):
├── OrderTargetSelector
│   ├── 판매회사 → CustomerDropdown (고객 선택)
│   └── 구매회사 → SellerDropdown (판매회사 선택)
├── ReadyMadeProductSearch
│   ├── SearchInput (키워드: 사이즈/품명/색깔)
│   └── ProductCandidateTable
│       └── Row: 품명|색깔|두께|사이즈|마대기준|일반가|마대가|[수량입력]
├── Cart
│   ├── CartItemTable
│   │   └── Row: 순번|품명|색깔|두께|사이즈|단가|수량|금액|묶음|[삭제]
│   ├── AdjustmentInput (+/- 선택 + 금액)
│   ├── VatToggle (0% / 10%)
│   ├── CartSummary (공급가/조정/부가세/총계)
│   └── CommentInput
├── StatusSelector (판매회사만: 견적요청/주문 등)
└── SubmitOrderButton
```

## 완료 체크리스트
- [ ] cart-store.ts (zustand + localStorage persist)
- [ ] Level→UnitPrice 매핑 함수
- [ ] 마대기준 가격 선택 로직
- [ ] 상품 검색 API + 컴포넌트
- [ ] 수량 입력 → 자동 가격 계산 → 장바구니 추가
- [ ] 장바구니 UI (수정/삭제/묶음)
- [ ] 합계 계산 (조정/부가세/총계)
- [ ] POST /api/orders 구현
- [ ] OrderID 생성 (Ticks 호환)
- [ ] 리그라운드 재고 차감 로직
- [ ] 구매회사 사전 체크 (IsCustomer, CheckOrderEnable)
- [ ] 판매/구매 분기 (상태 선택 등)
