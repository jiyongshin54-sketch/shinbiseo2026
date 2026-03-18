# Step 10: 청구서 / 거래명세표 / 전자세금계산서

## 1. 청구서 (Billing.aspx 클론)

### 기능
- 기간별 거래 내역 조회 (청구 목적)
- 거래처별 합산
- 인쇄 기능

### 페이지: /billing
```
├── 검색 필터 (기간, 거래처)
├── 청구 합산 테이블
│   거래처명 | 건수 | 공급가액 | 부가세 | 합계
└── [인쇄] 버튼 → CSS @media print
```

### API
- GET /api/billing?seller_id=xxx&date_from=xxx&date_to=xxx&customer_id=xxx

---

## 2. 거래명세표 (TradingStubPrint.aspx 클론)

### 기능
- 주문에 연결된 거래명세서 조회
- 거래명세서 신규 발행
- 인쇄용 레이아웃

### 페이지: /trading-stub-print
```
├── 검색 필터 (기간, 거래처, 상태)
├── 거래명세 목록
│   발행일 | 거래처 | 품목수 | 공급가액 | 부가세 | 합계 | 상태
├── 거래명세 상세 (선택 시)
│   품명 | 규격 | 단가 | 수량 | 금액 | 부가세
└── [인쇄] 버튼 → 인쇄 전용 레이아웃
```

### 인쇄 레이아웃
```
┌─────────────────────────────────┐
│          거  래  명  세  표       │
├────────┬────────────────────────┤
│ 공급자  │  공급받는자             │
│ 상호:   │  상호:                 │
│ 사업자: │  사업자:               │
├────────┴────────────────────────┤
│ 품명 | 규격 | 수량 | 단가 | 금액 │
│ .... | .... | .... | .... | ....│
├─────────────────────────────────┤
│ 합계금액:                        │
└─────────────────────────────────┘
```

### API
- GET /api/trading-stubs?seller_id=xxx&date_from=xxx&date_to=xxx
- GET /api/trading-stubs/[tsId]
- POST /api/trading-stubs (신규 발행)

---

## 3. 전자세금계산서 (eTaxBill.aspx 클론)

### 기능
- 전자세금계산서 조회 (외부 시스템 연동 가능성)
- 기존 로직 확인 필요 (eTaxBill.aspx.cs 분석)

### 페이지: /e-tax-bill
- 기존 코드 분석 후 상세 설계

---

## 공통: 인쇄 기능
```css
/* 인쇄 전용 CSS */
@media print {
  /* 네비게이션, 헤더 숨김 */
  header, nav, .sidebar, .no-print { display: none !important; }
  /* 인쇄 영역만 표시 */
  .print-area { width: 100%; }
}
```

## 완료 체크리스트
- [ ] Billing 페이지 + API
- [ ] TradingStub 목록 + 상세
- [ ] TradingStub 신규 발행
- [ ] TradingStub 인쇄 레이아웃
- [ ] eTaxBill 페이지 (기존 코드 분석 후)
- [ ] CSS @media print 설정
