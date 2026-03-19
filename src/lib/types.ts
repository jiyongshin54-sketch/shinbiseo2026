// ===== 권한 타입 =====
export type CompanyPower = '구매' | '판매'
export type UserPower = '대표' | '관리자' | '직원'
export type ApprovalStatus = '승인' | '신청' | '삭제'

// ===== 인증된 사용자 정보 =====
export interface AuthUser {
  authUid: string          // Supabase Auth UUID
  userId: string           // 기존 Google 21자리 ID
  userName: string
  mobileNumber: string
  emailAddress: string
  companyId: string
  companyName: string
  companyAlias: string
  companyPower: CompanyPower
  userPower: UserPower
}

// ===== DB 테이블 타입 =====

export interface Company {
  company_id: string
  company_name: string
  business_id: string | null
  owner_name: string | null
  phone_number: string | null
  fax_number: string | null
  email_address: string | null
  contact_id: string | null
  uptae: string | null
  jongmok: string | null
  address: string | null
  homepage: string | null
  account: string | null
  comment: string | null
  power: CompanyPower
  status: ApprovalStatus
  request_time: string | null
  approve_id: string | null
  approve_time: string | null
  company_alias: string | null
  issue_ti: string | null
}

export interface User {
  user_id: string
  auth_uid: string | null
  user_name: string | null
  mobile_number: string | null
  company_id: string | null
  power: UserPower
  status: ApprovalStatus
  request_time: string | null
  approve_id: string | null
  approve_time: string | null
  email_address: string | null
}

export interface Customer {
  seller_id: string
  customer_id: string
  company_id: string | null
  customer_name: string | null
  business_id: string | null
  owner_name: string | null
  phone_number: string | null
  fax_number: string | null
  email_address: string | null
  contact_name: string | null
  uptae: string | null
  jongmok: string | null
  address: string | null
  homepage: string | null
  account: string | null
  comment: string | null
  status: string | null
  register_id: string | null
  register_time: string | null
  last_modify_id: string | null
  last_modify_time: string | null
  level1: string | null
  level2: string | null
  level3: string | null
  payment: string | null
  issue_vat: string | null
}

export interface Contract {
  seller_id: string
  buyer_id: string
  customer_id: string | null
  seller_alias: string | null
  register_time: string | null
}

export interface Category {
  category_id: string
  category_l: string | null
  category_m: string | null
  category_s: string | null
}

export interface Product {
  seller_id: string
  product_id: string
  category_id: string | null
  attribute01: string | null
  attribute02: string | null
  attribute03: string | null
  attribute04: string | null
  attribute05: string | null
  attribute06: string | null
  attribute07: string | null
  attribute08: string | null
  attribute09: string | null
  attribute10: string | null
  unit_price01: number
  unit_price02: number
  unit_price03: number
  unit_price04: number
  unit_price05: number
  unit_price06: number
  unit_price07: number
  unit_price08: number
  unit_price09: number
  unit_price10: number
  unit_price11: number
  unit_price12: number
  unit_price13: number
  unit_price14: number
  unit_price15: number
  unit_price16: number
  unit_price17: number
  unit_price18: number
  unit_price19: number
  unit_price20: number
  register_id: string | null
  regist_time: string | null
  modifier_id: string | null
  modify_time: string | null
  stock: number
}

export interface OrderMaster {
  seller_id: string
  order_id: string
  order_date: string | null       // 'YYYY.MM.DD'
  customer_id: string | null
  ready_made: string | null       // '기성' | '맞춤'
  item_count: number
  sum_amount: number
  adjustment: number
  vat: number
  total_amount: number
  payment_method: string | null
  payment_date: string | null
  comment: string | null
  status: string | null
  orderer_id: string | null
  order_time: string | null
  ready_id: string | null
  ready_time: string | null
  receive_id: string | null
  receive_time: string | null
  finish_id: string | null
  finish_time: string | null
  cancel_id: string | null
  cancel_time: string | null
}

export interface OrderDetail {
  seller_id: string
  order_id: string
  sequence: number
  category_id: string | null
  attribute01: string | null
  attribute02: string | null
  attribute03: string | null
  attribute04: string | null
  attribute05: string | null
  attribute06: string | null
  attribute07: string | null
  attribute08: string | null
  attribute09: string | null
  attribute10: string | null
  price: number
  quantity: number
  amount: number
  vat: number
  group: string | null
  status: string | null
}

export interface TradingStubMaster {
  ts_id: string
  seller_id: string | null
  order_id: string | null
  customer_id: string | null
  issue_date: string | null
  item_count: number
  sum_amount: number
  sum_vat: number
  total_amount: number
  payment_method: string | null
  comment: string | null
  status: string | null
  issuer_id: string | null
  issue_time: string | null
  canceler_id: string | null
  cancel_time: string | null
  tax_invoice_id: string | null
}

export interface TradingStubDetail {
  ts_id: string
  sequence: number
  category_id: string | null
  description: string | null
  standard: string | null
  unit_price: number
  quantity: number
  amount: number
  vat: number
  d_comment: string | null
}

// ===== 전광판 주문 (JOIN 결과) =====
export interface DisplayBoardOrder extends OrderMaster {
  customer_name?: string
  orderer_name?: string
  seller_name?: string      // 구매회사용
  seller_alias?: string
  representative_item?: string  // 대표물건
  ready_name?: string
  receive_name?: string
  finish_name?: string
}

// ===== 장바구니 아이템 =====
export interface CartItem {
  sequence: number
  productId: string
  categoryId: string
  attribute01: string       // 품명
  attribute02: string       // 색깔
  attribute03: string       // 두께
  attribute04: string       // 사이즈 (기성) / 폭×길이 (맞춤)
  attribute05: string       // 마대수량 (기성) / 인쇄명 (맞춤)
  attribute06: string       // - (기성) / 도수 (맞춤)
  attribute07: string       // - (기성) / 가공방식 (맞춤)
  attribute08: string       // - (기성) / 도안명 (맞춤)
  attribute09: string
  attribute10: string       // CategoryS
  price: number             // 단가
  quantity: number          // 수량 (기성: ×100)
  amount: number            // 금액
  group: string             // 묶음
}
