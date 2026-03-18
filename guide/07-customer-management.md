# Step 6: 고객관리 (판매+구매 공통)

## 개요
판매회사와 구매회사 모두 고객(거래처)을 관리할 수 있음.
- **판매회사의 고객**: 자사에서 물건을 사가는 구매회사들
- **구매회사의 고객**: 자기가 물건을 되파는 자체 거래처들 (구매회사도 소매상에게 판매)

## 접근 권한
- **대표/관리자:** 고객 CRUD 전체 접근
- **직원:** 접근 불가 (탭 숨김)

## 기능 목록

### 1. 고객 목록 조회
- customers 테이블에서 seller_id = 내 회사
- 검색: 고객명, 사업자번호
- 필터: status, payment, issue_vat

### 2. 고객 등록 (신규)
```
입력 필드:
- 고객명 (필수)
- 사업자번호
- 대표자명
- 전화번호, 팩스, 이메일
- 담당자명
- 업태, 종목
- 주소
- 결제조건 (payment): 일결제 / 월결제
- 세금계산서 발행 여부 (issue_vat)
- 등급 Level1 (일반가 등급: 3.8급~5.0급)
- 등급 Level2 (마대가 등급: 3.8급~5.0급)
- 등급 Level3 (예비)
- 비고

처리:
1. customer_id 채번 (seller_id 기준 MAX+1, zero-padded 5자리)
2. customers INSERT
```

### 3. 고객 수정
- 기존 정보 로드 → 수정 → UPDATE

### 4. 고객 삭제 (소프트 삭제)
- customers → customers_deleted로 이동

### 5. Companies ↔ Customers 연결
- 고객이 신비서에 가입(Companies에 등록)하면 → customers.company_id에 CompanyID 매핑
- contracts 테이블에 seller_id + buyer_id 관계 등록
- 연결된 고객은 신비서 내에서 직접 주문/조회 가능

### 6. 미수금 관리 (판매회사)
**원본:** `거래처관리메뉴B_Click` → `ShinbsDB.GetReceivablesInfo()`
- 고객별 미수금 합계 표시
- 결제 유형별 분류: 일결제 / 월결제
- 이번 달 / 지난 달 미수금 비교
- 상태: 준비됨/일부준비됨/전부준비됨/수령 주문의 TotalAmount 합산

---

## API 설계

### GET /api/customers
```
Query: seller_id, search, status, payment
Response: Customer[]
```

### POST /api/customers
```
Body: Customer 데이터
처리: customer_id 자동 채번 → INSERT
```

### PATCH /api/customers/[sellerId]/[customerId]
```
Body: 수정할 필드들
```

### DELETE /api/customers/[sellerId]/[customerId]
```
처리: customers_deleted INSERT → customers DELETE
```

### GET /api/receivables?seller_id=xxx
```
Response: 고객별 미수금 합계 (일결제/월결제 분류)
```

---

## 컴포넌트 구조
```
고객관리 탭
├── CustomerSearchBar (검색 + 필터)
├── CustomerList (테이블)
│   └── CustomerRow → [수정] [삭제]
├── CustomerFormDialog (등록/수정 다이얼로그)
│   ├── 기본정보 (회사명, 사업자번호 등)
│   ├── 등급설정 (Level1, Level2, Level3 드롭다운: 3.8급~5.0급)
│   └── 결제조건 (payment, issue_vat)
├── ReceivablesSummary (미수금 현황 - 판매회사)
│   ├── DailyPaymentList (일결제 미수금)
│   └── MonthlyPaymentList (월결제 미수금)
└── CustomerDeleteConfirm (삭제 확인)
```

## 완료 체크리스트
- [ ] GET /api/customers 구현
- [ ] POST /api/customers 구현 (자동 채번)
- [ ] PATCH /api/customers 구현
- [ ] DELETE /api/customers 구현 (소프트 삭제)
- [ ] GET /api/receivables 구현 (미수금)
- [ ] CustomerList 컴포넌트
- [ ] CustomerFormDialog (등급 드롭다운 포함)
- [ ] ReceivablesSummary (판매회사)
- [ ] 고객-회사 연결 로직 (Contracts)
- [ ] 권한별 접근 제어
