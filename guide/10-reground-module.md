# Step 9: 리그라운드 전용 모듈 (클론코딩)

## 개요
Reground.aspx 클론. CompanyID='00046' (리그라운드/오픈패키지) 전용 주문 모듈.

## 원본: Reground.aspx.cs 참조
- 풍원 모듈과 유사한 구조
- 리그라운드 Products 기반 카탈로그
- seller_id = '00046' 고정

## 페이지 구조
```
/reground/page.tsx
├── CategoryTabs
├── ProductCatalog
│   ├── 속성 필터
│   └── ProductCard / ProductRow
├── Cart (공통 컴포넌트)
└── OrderSummary + SubmitButton
```

## 풍원 모듈과의 차이점
- seller_id = '00046'
- 카테고리 체계가 다를 수 있음
- 속성(Attribute) 의미가 다를 수 있음
- 기존 코드 비교 후 차이점 반영

## 접근 권한
- 리그라운드 직원 (company_id='00046'): 전체 접근
- 리그라운드와 계약된 구매회사: 카탈로그 조회 + 견적요청
- 그 외: 접근 불가

## 향후 범용화 계획
풍원/리그라운드 모듈은 seller_id만 다르고 구조가 거의 동일.
클론코딩 완료 후 → `/seller/[sellerId]` 형태의 범용 모듈로 리팩터링 예정.

## 완료 체크리스트
- [ ] Reground.aspx.cs 분석
- [ ] 풍원 모듈 대비 차이점 파악
- [ ] 카테고리 탭 구현
- [ ] 제품 카탈로그 표시
- [ ] 장바구니 + 주문 연동
- [ ] 접근 권한 체크
