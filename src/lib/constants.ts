// ===== 주문 상태 =====
export const ORDER_STATUS = {
  // 맞춤품 전용 (기성품은 바로 '주문'으로 시작)
  QUOTE_REQUEST: '견적 요청',
  QUOTE_RESPONSE: '견적 응답',
  // 공통
  ORDERED: '주문',
  PARTIAL_READY: '일부 준비됨',
  ALL_READY: '전부 준비됨',
  READY: '준비됨',
  WAITING_STOCK: '입고 대기중',
  NO_STOCK: '재고없음', // OrdersD 개별 품목 전용
  RECEIVED: '수령',
  FINISHED: '완료',
  // 취소 상태
  QUOTE_CANCELLED: '견적 취소',
  ORDER_CANCELLED: '주문 취소',
  READY_CANCELLED: '준비됨 취소',
  RECEIVE_CANCELLED: '수령 취소',
  FINISH_CANCELLED: '완료 취소',
} as const

// ===== 회사 권한 =====
export const COMPANY_POWER = {
  BUYER: '구매',
  SELLER: '판매',
} as const

// ===== 사용자 권한 =====
export const USER_POWER = {
  OWNER: '대표',
  ADMIN: '관리자',
  STAFF: '직원',
} as const

// ===== 승인 상태 =====
export const APPROVAL_STATUS = {
  APPROVED: '승인',
  PENDING: '신청',
  DELETED: '삭제',
} as const

// ===== 상품 구분 =====
export const READY_MADE = {
  READY: '기성',
  CUSTOM: '맞춤',
} as const

// ===== 결제 방식 =====
export const PAYMENT_METHOD = {
  CASH: '현금',
  COLLECT: '수금',
  TRANSFER: '이체',
  CARD: '카드',
} as const

// ===== 하드코딩 판매회사 ID (클론코딩용, 추후 범용화) =====
export const SELLER_COMPANIES = {
  PUNGWON: '00002',
  REGROUND: '00046',
} as const

// ===== 가격 등급 =====
export const PRICE_GRADES = [
  '3.8급', '3.9급', '4.0급', '4.1급', '4.2급',
  '4.3급', '4.4급', '4.5급', '4.6급', '4.7급',
  '4.8급', '4.9급', '5.0급',
] as const

// 등급 → UnitPrice 컬럼 인덱스 매핑 (1-based)
export const GRADE_TO_PRICE_INDEX: Record<string, number> = {
  '3.8급': 1, '3.9급': 2, '4.0급': 3, '4.1급': 4,
  '4.2급': 5, '4.3급': 6, '4.4급': 7, '4.5급': 8,
  '4.6급': 9, '4.7급': 10, '4.8급': 11, '4.9급': 12,
  '5.0급': 13,
}

// ===== 도수 (인쇄 색상 수) 매핑 =====
export const COLOR_COUNT_OPTIONS = [
  { label: '무지/없음', value: 0 },
  { label: '1도', value: 1 },
  { label: '2도', value: 2 },
  { label: '3도', value: 3 },
  { label: '양면 1도', value: 2 },
  { label: '양면 2도', value: 4 },
  { label: '양면 3도', value: 6 },
] as const

// ===== 전광판 색상 코딩 =====
export const DISPLAY_BOARD_COLORS: Record<string, string> = {
  '견적': 'bg-lime-200',           // YellowGreen
  '주문_기성': 'bg-yellow-200',     // Yellow
  '주문_맞춤': 'bg-sky-200',        // LightSkyBlue
  '재고없음': 'bg-gray-300',        // Silver
  '준비됨_기성': 'bg-orange-400',   // DarkOrange
  '준비됨_맞춤': 'bg-pink-500',     // DeepPink
}

// ===== 전광판 자동 리프레시 간격 (ms) =====
export const AUTO_REFRESH_INTERVAL = 30000 // 30초

// ===== 전광판 기본 lookback 일수 =====
export const DISPLAY_BOARD_LOOKBACK_DAYS = 15
