-- ============================================================
-- 신비서 DB 스키마 (MySQL → PostgreSQL 변환)
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ============ 1. categories ============
CREATE TABLE categories (
  category_id varchar(5) PRIMARY KEY,
  category_l varchar(45),
  category_m varchar(45),
  category_s varchar(45)
);

CREATE INDEX idx_categories_l ON categories(category_l);
CREATE INDEX idx_categories_m ON categories(category_m);
CREATE INDEX idx_categories_s ON categories(category_s);

-- ============ 2. companies ============
CREATE TABLE companies (
  company_id varchar(5) PRIMARY KEY,
  company_name varchar(45) NOT NULL,
  business_id varchar(10),
  owner_name varchar(10),
  phone_number varchar(20),
  fax_number varchar(20),
  email_address varchar(45),
  contact_id varchar(21),
  uptae varchar(45),
  jongmok varchar(45),
  address varchar(100),
  homepage varchar(45),
  account varchar(45),
  comment varchar(100),
  power varchar(5) NOT NULL,
  status varchar(5) NOT NULL,
  request_time timestamptz,
  approve_id varchar(21),
  approve_time timestamptz,
  company_alias varchar(20),
  issue_ti varchar(10)
);

CREATE INDEX idx_companies_business_id ON companies(business_id);
CREATE INDEX idx_companies_alias ON companies(company_alias);
CREATE INDEX idx_companies_power ON companies(power);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_name ON companies(company_name);

-- ============ 3. companies_deleted ============
CREATE TABLE companies_deleted (
  company_id varchar(5) NOT NULL,
  company_name varchar(45),
  business_id varchar(10),
  owner_name varchar(10),
  phone_number varchar(20),
  fax_number varchar(20),
  email_address varchar(45),
  contact_id varchar(21),
  uptae varchar(45),
  jongmok varchar(45),
  address varchar(100),
  homepage varchar(45),
  account varchar(45),
  comment varchar(100),
  power varchar(5),
  status varchar(5),
  request_time timestamptz,
  approve_id varchar(21),
  approve_time timestamptz,
  company_alias varchar(20),
  issue_ti varchar(10),
  deleted_time timestamptz NOT NULL,
  deleter_id char(21) NOT NULL,
  PRIMARY KEY (company_id, deleted_time)
);

-- ============ 4. users ============
CREATE TABLE users (
  user_id char(21) PRIMARY KEY,
  auth_uid uuid UNIQUE,
  user_name varchar(20),
  mobile_number varchar(20),
  company_id varchar(5) REFERENCES companies(company_id),
  power varchar(5) NOT NULL,
  status varchar(5) NOT NULL,
  request_time timestamptz,
  approve_id varchar(21),
  approve_time timestamptz,
  email_address varchar(45)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_power ON users(power);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_auth_uid ON users(auth_uid);

-- ============ 5. users_deleted ============
CREATE TABLE users_deleted (
  user_id char(21) NOT NULL,
  user_name varchar(20),
  mobile_number varchar(20),
  company_id varchar(5),
  power varchar(5),
  status varchar(5),
  request_time timestamptz,
  approve_id varchar(21),
  approve_time timestamptz,
  email_address varchar(45),
  deleted_time timestamptz NOT NULL,
  deleter_id char(21) NOT NULL,
  PRIMARY KEY (user_id, deleted_time)
);

-- ============ 6. customers ============
CREATE TABLE customers (
  seller_id varchar(5) NOT NULL,
  customer_id varchar(5) NOT NULL,
  company_id varchar(5),
  customer_name varchar(45),
  business_id varchar(10),
  owner_name varchar(10),
  phone_number varchar(20),
  fax_number varchar(20),
  email_address varchar(45),
  contact_name varchar(10),
  uptae varchar(45),
  jongmok varchar(45),
  address varchar(100),
  homepage varchar(45),
  account varchar(45),
  comment varchar(100),
  status varchar(5),
  register_id varchar(21),
  register_time timestamptz,
  last_modify_id varchar(21),
  last_modify_time timestamptz,
  level1 varchar(5),
  level2 varchar(5),
  level3 varchar(5),
  payment varchar(5),
  issue_vat varchar(5),
  PRIMARY KEY (seller_id, customer_id)
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_name ON customers(customer_name);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_payment ON customers(payment);
CREATE INDEX idx_customers_issue_vat ON customers(issue_vat);

-- ============ 7. customers_deleted ============
CREATE TABLE customers_deleted (
  seller_id varchar(5) NOT NULL,
  customer_id varchar(5) NOT NULL,
  company_id varchar(5),
  customer_name varchar(45),
  business_id varchar(10),
  owner_name varchar(10),
  phone_number varchar(20),
  fax_number varchar(20),
  email_address varchar(45),
  contact_name varchar(10),
  uptae varchar(45),
  jongmok varchar(45),
  address varchar(100),
  homepage varchar(45),
  account varchar(45),
  comment varchar(100),
  status varchar(5),
  register_id varchar(21),
  register_time timestamptz,
  last_modify_id varchar(21),
  last_modify_time timestamptz,
  level1 varchar(5),
  level2 varchar(5),
  level3 varchar(5),
  payment varchar(5),
  issue_vat varchar(5),
  deleted_time timestamptz NOT NULL,
  deleter_id char(21) NOT NULL,
  PRIMARY KEY (seller_id, customer_id, deleted_time)
);

-- ============ 8. contracts ============
CREATE TABLE contracts (
  seller_id varchar(5) NOT NULL,
  buyer_id varchar(5) NOT NULL,
  customer_id varchar(5),
  seller_alias varchar(25),
  register_time timestamptz,
  PRIMARY KEY (seller_id, buyer_id)
);

CREATE INDEX idx_contracts_customer ON contracts(customer_id);

-- ============ 9. products ============
CREATE TABLE products (
  seller_id varchar(5) NOT NULL,
  product_id varchar(5) NOT NULL,
  category_id varchar(5) REFERENCES categories(category_id),
  attribute01 varchar(10),
  attribute02 varchar(10),
  attribute03 varchar(10),
  attribute04 varchar(10),
  attribute05 varchar(10),
  attribute06 varchar(10),
  attribute07 varchar(10),
  attribute08 varchar(10),
  attribute09 varchar(10),
  attribute10 varchar(10),
  unit_price01 numeric(10,2) DEFAULT 0,
  unit_price02 numeric(10,2) DEFAULT 0,
  unit_price03 numeric(10,2) DEFAULT 0,
  unit_price04 numeric(10,2) DEFAULT 0,
  unit_price05 numeric(10,2) DEFAULT 0,
  unit_price06 numeric(10,2) DEFAULT 0,
  unit_price07 numeric(10,2) DEFAULT 0,
  unit_price08 numeric(10,2) DEFAULT 0,
  unit_price09 numeric(10,2) DEFAULT 0,
  unit_price10 numeric(10,2) DEFAULT 0,
  unit_price11 numeric(10,2) DEFAULT 0,
  unit_price12 numeric(10,2) DEFAULT 0,
  unit_price13 numeric(10,2) DEFAULT 0,
  unit_price14 numeric(10,2) DEFAULT 0,
  unit_price15 numeric(10,2) DEFAULT 0,
  unit_price16 numeric(10,2) DEFAULT 0,
  unit_price17 numeric(10,2) DEFAULT 0,
  unit_price18 numeric(10,2) DEFAULT 0,
  unit_price19 numeric(10,2) DEFAULT 0,
  unit_price20 numeric(10,2) DEFAULT 0,
  register_id varchar(21),
  regist_time timestamptz,
  modifier_id varchar(21),
  modify_time timestamptz,
  stock integer DEFAULT 0,
  PRIMARY KEY (seller_id, product_id)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_attr1 ON products(attribute01);
CREATE INDEX idx_products_attr2 ON products(attribute02);
CREATE INDEX idx_products_attr3 ON products(attribute03);

-- ============ 10. orders_m ============
CREATE TABLE orders_m (
  seller_id varchar(5) NOT NULL,
  order_id varchar(18) NOT NULL,
  order_date varchar(10),
  customer_id varchar(5),
  ready_made varchar(5),
  item_count integer DEFAULT 0,
  sum_amount numeric(10,0) DEFAULT 0,
  adjustment numeric(10,0) DEFAULT 0,
  vat numeric(10,0) DEFAULT 0,
  total_amount numeric(10,0) DEFAULT 0,
  payment_method varchar(5),
  payment_date varchar(10),
  comment varchar(100),
  status varchar(10),
  orderer_id varchar(21),
  order_time timestamptz,
  ready_id varchar(21),
  ready_time timestamptz,
  receive_id varchar(21),
  receive_time timestamptz,
  finish_id varchar(21),
  finish_time timestamptz,
  cancel_id varchar(21),
  cancel_time timestamptz,
  PRIMARY KEY (order_id, seller_id)
);

CREATE INDEX idx_orders_m_seller ON orders_m(seller_id);
CREATE INDEX idx_orders_m_date ON orders_m(order_date);
CREATE INDEX idx_orders_m_customer ON orders_m(customer_id);
CREATE INDEX idx_orders_m_ready_made ON orders_m(ready_made);
CREATE INDEX idx_orders_m_payment ON orders_m(payment_method);
CREATE INDEX idx_orders_m_status ON orders_m(status);

-- ============ 11. orders_d ============
CREATE TABLE orders_d (
  seller_id varchar(5) NOT NULL,
  order_id varchar(18) NOT NULL,
  sequence integer NOT NULL,
  category_id varchar(5),
  attribute01 varchar(20),
  attribute02 varchar(20),
  attribute03 varchar(20),
  attribute04 varchar(20),
  attribute05 varchar(20),
  attribute06 varchar(20),
  attribute07 varchar(20),
  attribute08 varchar(20),
  attribute09 varchar(20),
  attribute10 varchar(20),
  price numeric(8,2) DEFAULT 0,
  quantity integer DEFAULT 0,
  amount numeric(10,0) DEFAULT 0,
  vat numeric(10,0) DEFAULT 0,
  "group" varchar(5),
  status varchar(10),
  PRIMARY KEY (seller_id, order_id, sequence)
);

CREATE INDEX idx_orders_d_category ON orders_d(category_id);
CREATE INDEX idx_orders_d_status ON orders_d(status);
CREATE INDEX idx_orders_d_group ON orders_d("group");
CREATE INDEX idx_orders_d_attr1 ON orders_d(attribute01);
CREATE INDEX idx_orders_d_attr2 ON orders_d(attribute02);
CREATE INDEX idx_orders_d_attr3 ON orders_d(attribute03);
CREATE INDEX idx_orders_d_attr4 ON orders_d(attribute04);

-- ============ 12. trading_stubs_m ============
CREATE TABLE trading_stubs_m (
  ts_id varchar(18) PRIMARY KEY,
  seller_id varchar(5),
  order_id varchar(18),
  customer_id varchar(5),
  issue_date varchar(10),
  item_count integer DEFAULT 0,
  sum_amount numeric(10,0) DEFAULT 0,
  sum_vat numeric(10,0) DEFAULT 0,
  total_amount numeric(10,0) DEFAULT 0,
  payment_method varchar(5),
  comment varchar(100),
  status varchar(10),
  issuer_id varchar(21),
  issue_time timestamptz,
  canceler_id varchar(21),
  cancel_time timestamptz,
  tax_invoice_id varchar(18)
);

CREATE INDEX idx_ts_m_seller ON trading_stubs_m(seller_id);
CREATE INDEX idx_ts_m_order ON trading_stubs_m(order_id);
CREATE INDEX idx_ts_m_customer ON trading_stubs_m(customer_id);
CREATE INDEX idx_ts_m_issue_date ON trading_stubs_m(issue_date);
CREATE INDEX idx_ts_m_payment ON trading_stubs_m(payment_method);
CREATE INDEX idx_ts_m_status ON trading_stubs_m(status);

-- ============ 13. trading_stubs_d ============
CREATE TABLE trading_stubs_d (
  ts_id varchar(18) NOT NULL,
  sequence integer NOT NULL,
  category_id varchar(5),
  description varchar(50),
  standard varchar(20),
  unit_price numeric(8,2) DEFAULT 0,
  quantity integer DEFAULT 0,
  amount numeric(10,0) DEFAULT 0,
  vat numeric(10,0) DEFAULT 0,
  d_comment varchar(50),
  PRIMARY KEY (ts_id, sequence)
);

CREATE INDEX idx_ts_d_category ON trading_stubs_d(category_id);
CREATE INDEX idx_ts_d_description ON trading_stubs_d(description);
CREATE INDEX idx_ts_d_standard ON trading_stubs_d(standard);
