# Step 8: 풍원 전용 모듈 (클론코딩)

## 개요
Pungwon.aspx 클론. CompanyID='00002' (풍원) 전용 주문 모듈.
기성품 카탈로그 기반 주문 시스템.

## 원본: Pungwon.aspx.cs 참조
- 풍원의 Products 테이블 기반 카탈로그
- 카테고리(CategoryM) 필터링
- 속성(Attribute) 기반 제품 검색
- 선택한 제품을 장바구니에 추가 → 주문

## 페이지 구조
```
/pungwon/page.tsx
├── CategoryTabs (카테고리 중분류 탭)
│   예: 지퍼백, OPP봉투, 원단, 링봉투, 에어캡, ...
├── ProductCatalog (선택된 카테고리의 제품 그리드)
│   ├── 속성 필터 (Attribute01~04 기반)
│   └── ProductCard / ProductRow
│       - 속성 표시
│       - 단가 표시 (고객 등급별)
│       - 수량 입력
│       - [장바구니 추가] 버튼
├── Cart (장바구니 - 공통 컴포넌트 재사용)
└── OrderSummary + SubmitButton
```

## 주요 로직
1. seller_id = '00002' 고정
2. Products에서 카테고리별 조회
3. 고객의 level1~3에 따라 unit_price01~20 중 해당 가격 표시
4. 장바구니 → 주문 생성 (ready_made = '기성')

## API
- GET /api/products?seller_id=00002&category_id=xxx
- POST /api/orders (공통)

## 접근 권한
- 풍원 직원 (company_id='00002'): 전체 접근
- 풍원과 계약된 구매회사: 카탈로그 조회 + 견적요청 가능
- 그 외: 접근 불가

## 완료 체크리스트
- [ ] 카테고리 탭 구현
- [ ] 제품 카탈로그 표시
- [ ] 속성 필터링
- [ ] 고객별 가격 등급 적용
- [ ] 장바구니 연동
- [ ] 주문 생성
- [ ] 접근 권한 체크
