-- ============================================================
-- RLS (Row Level Security) 정책
-- 001_create_tables.sql 실행 후 실행
-- ============================================================

-- ===== 헬퍼 함수 =====

-- 현재 로그인 사용자의 company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS varchar(5)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM users
  WHERE auth_uid = auth.uid()
    AND status = '승인'
  LIMIT 1;
$$;

-- 현재 로그인 사용자의 회사 power (구매/판매)
CREATE OR REPLACE FUNCTION get_my_company_power()
RETURNS varchar(5)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.power
  FROM companies c
  JOIN users u ON u.company_id = c.company_id
  WHERE u.auth_uid = auth.uid()
    AND u.status = '승인'
  LIMIT 1;
$$;

-- 현재 로그인 사용자의 user power (대표/관리자/직원)
CREATE OR REPLACE FUNCTION get_my_user_power()
RETURNS varchar(5)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT power
  FROM users
  WHERE auth_uid = auth.uid()
    AND status = '승인'
  LIMIT 1;
$$;

-- 현재 로그인 사용자의 user_id (char21)
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS char(21)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id
  FROM users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
$$;


-- ===== RLS 활성화 =====

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_m ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_d ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_stubs_m ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_stubs_d ENABLE ROW LEVEL SECURITY;


-- ===== categories: 모든 인증 사용자 조회 가능 =====
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ===== companies: 모든 인증 사용자 조회, 자사만 수정 =====
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (company_id = get_my_company_id());


-- ===== companies_deleted: 자사 것만 =====
CREATE POLICY "companies_deleted_select" ON companies_deleted
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "companies_deleted_insert" ON companies_deleted
  FOR INSERT WITH CHECK (company_id = get_my_company_id());


-- ===== users: 자기 자신 + 같은 회사 =====
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (auth_uid = auth.uid());

CREATE POLICY "users_select_company" ON users
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (auth_uid = auth.uid());

-- 대표만 같은 회사 직원 수정 가능
CREATE POLICY "users_update_company" ON users
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_user_power() = '대표'
  );


-- ===== users_deleted: 자사 것만 =====
CREATE POLICY "users_deleted_select" ON users_deleted
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "users_deleted_insert" ON users_deleted
  FOR INSERT WITH CHECK (company_id = get_my_company_id());


-- ===== customers: seller_id = 내 회사 (판매회사의 고객) =====
-- 또는 buyer_id로 계약된 경우 (구매회사가 자기 고객을 관리하는 경우도 seller_id = 자사)
CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());

CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (seller_id = get_my_company_id());

CREATE POLICY "customers_delete" ON customers
  FOR DELETE USING (seller_id = get_my_company_id());


-- ===== customers_deleted =====
CREATE POLICY "customers_deleted_select" ON customers_deleted
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "customers_deleted_insert" ON customers_deleted
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());


-- ===== contracts: 판매회사 또는 구매회사로서 조회 =====
CREATE POLICY "contracts_select_seller" ON contracts
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "contracts_select_buyer" ON contracts
  FOR SELECT USING (buyer_id = get_my_company_id());

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT WITH CHECK (
    seller_id = get_my_company_id()
    OR buyer_id = get_my_company_id()
  );

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE USING (seller_id = get_my_company_id());


-- ===== products: 판매회사 자사 제품 + 계약된 구매회사 조회 =====
CREATE POLICY "products_select_seller" ON products
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "products_select_buyer" ON products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = products.seller_id
        AND contracts.buyer_id = get_my_company_id()
    )
  );

CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (seller_id = get_my_company_id());

CREATE POLICY "products_delete" ON products
  FOR DELETE USING (seller_id = get_my_company_id());


-- ===== orders_m: 판매회사 → 자사 주문, 구매회사 → 계약된 주문 =====
CREATE POLICY "orders_m_select_seller" ON orders_m
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "orders_m_select_buyer" ON orders_m
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = orders_m.seller_id
        AND contracts.buyer_id = get_my_company_id()
        AND contracts.customer_id = orders_m.customer_id
    )
  );

CREATE POLICY "orders_m_insert_seller" ON orders_m
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());

-- 구매회사도 주문 생성 가능 (계약된 판매회사에)
CREATE POLICY "orders_m_insert_buyer" ON orders_m
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = orders_m.seller_id
        AND contracts.buyer_id = get_my_company_id()
    )
  );

CREATE POLICY "orders_m_update_seller" ON orders_m
  FOR UPDATE USING (seller_id = get_my_company_id());

-- 구매회사도 상태 변경 가능 (수령 확인 등)
CREATE POLICY "orders_m_update_buyer" ON orders_m
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = orders_m.seller_id
        AND contracts.buyer_id = get_my_company_id()
        AND contracts.customer_id = orders_m.customer_id
    )
  );


-- ===== orders_d: orders_m과 동일한 접근 규칙 =====
CREATE POLICY "orders_d_select_seller" ON orders_d
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "orders_d_select_buyer" ON orders_d
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts c
      JOIN orders_m m ON m.seller_id = c.seller_id AND m.customer_id = c.customer_id
      WHERE c.seller_id = orders_d.seller_id
        AND c.buyer_id = get_my_company_id()
        AND m.order_id = orders_d.order_id
    )
  );

CREATE POLICY "orders_d_insert_seller" ON orders_d
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());

CREATE POLICY "orders_d_insert_buyer" ON orders_d
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = orders_d.seller_id
        AND contracts.buyer_id = get_my_company_id()
    )
  );

CREATE POLICY "orders_d_update_seller" ON orders_d
  FOR UPDATE USING (seller_id = get_my_company_id());


-- ===== trading_stubs_m: 판매회사 자사 + 구매회사 계약 =====
CREATE POLICY "ts_m_select_seller" ON trading_stubs_m
  FOR SELECT USING (seller_id = get_my_company_id());

CREATE POLICY "ts_m_select_buyer" ON trading_stubs_m
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.seller_id = trading_stubs_m.seller_id
        AND contracts.buyer_id = get_my_company_id()
        AND contracts.customer_id = trading_stubs_m.customer_id
    )
  );

CREATE POLICY "ts_m_insert" ON trading_stubs_m
  FOR INSERT WITH CHECK (seller_id = get_my_company_id());

CREATE POLICY "ts_m_update" ON trading_stubs_m
  FOR UPDATE USING (seller_id = get_my_company_id());


-- ===== trading_stubs_d: ts_m과 연동 =====
CREATE POLICY "ts_d_select" ON trading_stubs_d
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trading_stubs_m tsm
      WHERE tsm.ts_id = trading_stubs_d.ts_id
        AND (
          tsm.seller_id = get_my_company_id()
          OR EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.seller_id = tsm.seller_id
              AND contracts.buyer_id = get_my_company_id()
              AND contracts.customer_id = tsm.customer_id
          )
        )
    )
  );

CREATE POLICY "ts_d_insert" ON trading_stubs_d
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_stubs_m tsm
      WHERE tsm.ts_id = trading_stubs_d.ts_id
        AND tsm.seller_id = get_my_company_id()
    )
  );

CREATE POLICY "ts_d_update" ON trading_stubs_d
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trading_stubs_m tsm
      WHERE tsm.ts_id = trading_stubs_d.ts_id
        AND tsm.seller_id = get_my_company_id()
    )
  );
