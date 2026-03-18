# Step 5-1: 맞춤품 주문 (가격 산정 공식)

## 개요
기성품이 아닌 맞춤 제작 상품을 주문하는 플로우. 두께/폭/길이/인쇄 등을 지정하여 단가가 자동 계산됨.

## 맞춤품 가격 공식 ★

### 기본 공식
```
단가 = Round(ValueA + ValueB, 소수점 1자리)
```

### ValueA (재료비)
```
ValueA = 두께 × 폭 × (길이 + 5.0) × 0.184 × 등급상수
```
- **두께**: mm (사용자 입력)
- **폭**: mm (사용자 입력)
- **길이**: mm (사용자 입력), +5.0은 접착/여유분
- **0.184**: 고정 재료비 계수
- **등급상수**: 고객 Level에서 "급" 제거한 숫자값 (예: "3.8급" → 3.8)

### ValueB (인쇄비)
```
도수값 == 0일 때: ValueB = 0
도수값 > 0일 때:  ValueB = max((도수값 × 8000 × 폭) / 45700, 2.0)
```
- 최소 인쇄비 = 2.0원 (floor)
- 폭이 넓을수록, 도수가 많을수록 인쇄비 증가

### 등급상수 결정
- **구매회사 측 (Reground.aspx.cs):** `MyCustomerLevel1` 직접 사용
- **판매회사 측 (Main.aspx.cs Get맞춤단가):** `CustomerLevel2`에서 "급" 제거 후 사용
  - 판매회사는 DB에서 `ShinbsDB.GetCustomerFieldName(SellerID, CustomerID, "Level2")` 호출

### 도수(인쇄 색상 수) 매핑
| 드롭다운 인덱스 | 표시 텍스트 | 도수값 |
|---------------|-----------|--------|
| 0 | 무지/없음 | 0 |
| 1 | 1도 | 1 |
| 2 | 2도 | 2 |
| 3 | 3도 | 3 |
| 4 | 양면 1도 | 2 |
| 5 | 양면 2도 | 4 |
| 6 | 양면 3도 | 6 |

> 양면은 앞뒤 인쇄이므로 도수값 = 색상수 × 2

---

## 맞춤품 주문 입력 폼

### 입력 필드
| 필드 | 용도 | 가격 영향 | CartTable 컬럼 |
|------|------|----------|---------------|
| 품명 | 제품명 | X | Attribute01 |
| 색깔 | 색상 | X | Attribute02 |
| **두께** | 두께 (mm) | **O** (ValueA) | Attribute03 |
| **폭** | 너비 (mm) | **O** (ValueA, ValueB) | Attribute04의 일부 |
| **길이** | 길이 (mm) | **O** (ValueA) | Attribute04의 일부 |
| **도수** | 인쇄 색상 수 | **O** (ValueB) | Attribute06 |
| 인쇄명 | 인쇄할 텍스트 | X | Attribute05 |
| 가공방식 | 접착/진공 등 | X | Attribute07 |
| 도안명 | 디자인파일명 | X | Attribute08 |
| **수량** | 주문 수량 | 금액 계산 | Quantity |

### 자동 계산 흐름
```
1. 두께/폭/길이/도수 입력
2. [단가 계산] 버튼 클릭 → Get맞춤단가() / GetCustomizedProductUnitPrice()
3. 계산된 단가 표시 (수정 가능 - 판매회사가 임의 조정 가능)
4. 수량 입력
5. 금액 = 단가 × 수량
6. [장바구니 추가]
```

### 단가 수동 조정
- 자동 계산 후 `맞춤단가TB`에 표시된 값을 사용자가 직접 수정 가능
- 수정 시 `맞춤단가TB_TextChanged` → 금액만 재계산 (공식 재실행 안함)

---

## 판매회사 vs 구매회사 차이

### 견적 프로세스 (맞춤품 전용) ★
> **중요**: 견적 요청 → 견적 응답 플로우는 맞춤품에만 존재.
> 기성품은 견적 과정 없이 바로 "주문" 상태로 시작됨.

```
[구매회사]                         [판매회사]
맞춤품 입력 + 단가 계산
  → "견적 요청" 제출 ──────────→ 견적 요청 접수
                                  가격 검토/조정
                  ←────────────── "견적 응답" 전송
가격 확인
  → "주문 확정" ───────────────→ 주문 접수 (이후 기성품과 동일 흐름)
```

### 구매회사 맞춤 주문
- 단가 계산 후 **"견적 요청"** 상태로 제출 (기성품의 "주문"과 다름)
- 판매회사가 "견적 응답" (가격 조정 가능)
- 구매회사가 "주문 확정"
- 그 이후는 기성품과 동일 (품목 준비 → 수령 → 완료)

### 판매회사 맞춤 등록
- 고객 선택 후 맞춤품 직접 등록
- 상태 선택 가능 (견적 요청/견적 등록/주문 등록/신규주문 등)
- Level2 기반 등급상수로 자동 단가 계산
- 조정부호(+/-) + 합계조정 금액 입력 가능

---

## TypeScript 구현

### 가격 계산 함수
```typescript
interface CustomPriceParams {
  thickness: number    // 두께 (mm)
  width: number        // 폭 (mm)
  length: number       // 길이 (mm)
  colorCount: number   // 도수값 (0~6)
  gradeConstant: number // 등급상수 (3.8~5.0)
}

function calculateCustomPrice(params: CustomPriceParams): number {
  const { thickness, width, length, colorCount, gradeConstant } = params

  // ValueA: 재료비
  const valueA = thickness * width * (length + 5.0) * 0.184 * gradeConstant

  // ValueB: 인쇄비
  let valueB = 0
  if (colorCount > 0) {
    valueB = Math.max((colorCount * 8000 * width) / 45700, 2.0)
  }

  // 단가 = Round(A + B, 1)
  return Math.round((valueA + valueB) * 10) / 10
}
```

### 도수 매핑
```typescript
const COLOR_COUNT_MAP: Record<number, number> = {
  0: 0,   // 무지
  1: 1,   // 1도
  2: 2,   // 2도
  3: 3,   // 3도
  4: 2,   // 양면 1도
  5: 4,   // 양면 2도
  6: 6,   // 양면 3도
}

const COLOR_COUNT_LABELS = [
  '무지/없음', '1도', '2도', '3도',
  '양면 1도', '양면 2도', '양면 3도'
]
```

---

## 컴포넌트 구조

```
맞춤품 주문 화면 (Main 내 탭 또는 패널):
├── OrderTargetSelector (판매회사/고객 선택 - 기성품과 공유)
├── CustomOrderForm
│   ├── Row1: 품명, 색깔
│   ├── Row2: 두께, 폭, 길이 (숫자 입력)
│   ├── Row3: 도수 (드롭다운), 인쇄명
│   ├── Row4: 가공방식, 도안명
│   ├── PriceCalculation
│   │   ├── [단가 계산] 버튼
│   │   ├── 계산된 단가 표시 (수정 가능)
│   │   └── 수량 입력 → 금액 자동 표시
│   └── [장바구니 추가] 버튼
├── Cart (기성품과 동일 컴포넌트, readyMade='맞춤')
└── SubmitOrderButton
```

---

## OrdersD 저장 형태 (맞춤품)

| OrdersD 컬럼 | 맞춤품 값 |
|-------------|----------|
| CategoryID | 카테고리 (있으면) |
| Attribute01 | 품명 |
| Attribute02 | 색깔 |
| Attribute03 | 두께 |
| Attribute04 | 폭×길이 (예: "250*350") |
| Attribute05 | 인쇄명 |
| Attribute06 | 도수 (예: "2도") |
| Attribute07 | 가공방식 |
| Attribute08 | 도안명 |
| Price | 계산된 단가 |
| Quantity | 수량 |
| Amount | 금액 |
| Group | 묶음 |
| Status | '' (초기) → '준비됨' → ... |

## 완료 체크리스트
- [ ] calculateCustomPrice 함수 구현
- [ ] 도수 매핑 + 드롭다운
- [ ] 맞춤품 입력 폼 UI
- [ ] [단가 계산] 버튼 + 자동 계산
- [ ] 단가 수동 조정 기능
- [ ] 장바구니 추가 (readyMade='맞춤' 구분)
- [ ] 판매/구매 분기 (등급상수 소스 차이)
- [ ] 견적 요청 → 견적 응답 → 주문 확정 플로우
