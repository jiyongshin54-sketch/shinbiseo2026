/**
 * MySQL → PostgreSQL (Supabase) 마이그레이션 변환 스크립트
 *
 * 사용법: node scripts/migration/convert-all.js
 *
 * 입력: D:/db20260320/shinbiseodb_*.sql (MySQL dump)
 * 출력: D:/projects/shinbiseo2026/scripts/migration/output/ (PostgreSQL INSERT SQL)
 *
 * 의존성 순서대로 13개 파일 생성:
 *   01_categories.sql → 13_trading_stubs_d.sql
 */

const fs = require('fs')
const path = require('path')

const INPUT_DIR = 'D:/db20260320'
const OUTPUT_DIR = path.join(__dirname, 'output')

// 테이블 매핑: MySQL 테이블명 → PostgreSQL 테이블명
// 컬럼 매핑: MySQL PascalCase → PostgreSQL snake_case
const TABLE_CONFIGS = [
  {
    order: '01',
    mysqlFile: 'shinbiseodb_Categories.sql',
    mysqlTable: 'Categories',
    pgTable: 'categories',
    columns: {
      'CategoryID': 'category_id',
      'CategoryL': 'category_l',
      'CategoryM': 'category_m',
      'CategoryS': 'category_s',
    }
  },
  {
    order: '02',
    mysqlFile: 'shinbiseodb_Companies.sql',
    mysqlTable: 'Companies',
    pgTable: 'companies',
    columns: {
      'CompanyID': 'company_id',
      'CompanyName': 'company_name',
      'BusinessID': 'business_id',
      'OwnerName': 'owner_name',
      'PhoneNumber': 'phone_number',
      'FaxNumber': 'fax_number',
      'EmailAddress': 'email_address',
      'ContactID': 'contact_id',
      'Uptae': 'uptae',
      'Jongmok': 'jongmok',
      'Address': 'address',
      'Homepage': 'homepage',
      'Account': 'account',
      'Comment': 'comment',
      'Power': 'power',
      'Status': 'status',
      'RequestTime': 'request_time',
      'ApproveID': 'approve_id',
      'ApproveTime': 'approve_time',
      'CompanyAlias': 'company_alias',
      'IssueTI': 'issue_ti',
    }
  },
  {
    order: '03',
    mysqlFile: 'shinbiseodb_CompaniesDeleted.sql',
    mysqlTable: 'CompaniesDeleted',
    pgTable: 'companies_deleted',
    columns: {
      'CompanyID': 'company_id',
      'DeletedTime': 'deleted_time',
      'DeleterID': 'deleter_id',
      'CompanyName': 'company_name',
      'BusinessID': 'business_id',
      'OwnerName': 'owner_name',
      'PhoneNumber': 'phone_number',
      'FaxNumber': 'fax_number',
      'EmailAddress': 'email_address',
      'ContactID': 'contact_id',
      'Uptae': 'uptae',
      'Jongmok': 'jongmok',
      'Address': 'address',
      'Homepage': 'homepage',
      'Account': 'account',
      'Comment': 'comment',
      'Power': 'power',
      'Status': 'status',
      'RequestTime': 'request_time',
      'ApproveID': 'approve_id',
      'ApproveTime': 'approve_time',
      'CompanyAlias': 'company_alias',
    }
  },
  {
    order: '04',
    mysqlFile: 'shinbiseodb_Users.sql',
    mysqlTable: 'Users',
    pgTable: 'users',
    columns: {
      'UserID': 'user_id',
      'UserName': 'user_name',
      'MobileNumber': 'mobile_number',
      'CompanyID': 'company_id',
      'Power': 'power',
      'Status': 'status',
      'RequestTime': 'request_time',
      'ApproveID': 'approve_id',
      'ApproveTime': 'approve_time',
      'EmailAddress': 'email_address',
    }
  },
  {
    order: '05',
    mysqlFile: 'shinbiseodb_UsersDeleted.sql',
    mysqlTable: 'UsersDeleted',
    pgTable: 'users_deleted',
    columns: {
      'UserID': 'user_id',
      'DeletedTime': 'deleted_time',
      'DeleterID': 'deleter_id',
      'UserName': 'user_name',
      'MobileNumber': 'mobile_number',
      'CompanyID': 'company_id',
      'Power': 'power',
      'Status': 'status',
      'RequestTime': 'request_time',
      'ApproveID': 'approve_id',
      'ApproveTime': 'approve_time',
    }
  },
  {
    order: '06',
    mysqlFile: 'shinbiseodb_Customers.sql',
    mysqlTable: 'Customers',
    pgTable: 'customers',
    columns: {
      'SellerID': 'seller_id',
      'CustomerID': 'customer_id',
      'CompanyID': 'company_id',
      'CustomerName': 'customer_name',
      'BusinessID': 'business_id',
      'OwnerName': 'owner_name',
      'PhoneNumber': 'phone_number',
      'FaxNumber': 'fax_number',
      'EmailAddress': 'email_address',
      'ContactName': 'contact_name',
      'Uptae': 'uptae',
      'Jongmok': 'jongmok',
      'Address': 'address',
      'Homepage': 'homepage',
      'Account': 'account',
      'Comment': 'comment',
      'Status': 'status',
      'RegisterID': 'register_id',
      'RegisterTime': 'register_time',
      'LastModifyID': 'last_modify_id',
      'LastModifyTime': 'last_modify_time',
      'Level1': 'level1',
      'Level2': 'level2',
      'Level3': 'level3',
      'Payment': 'payment',
      'IssueVAT': 'issue_vat',
    }
  },
  {
    order: '07',
    mysqlFile: 'shinbiseodb_CustomersDeleted.sql',
    mysqlTable: 'CustomersDeleted',
    pgTable: 'customers_deleted',
    columns: {
      'SellerID': 'seller_id',
      'CustomerID': 'customer_id',
      'DeletedTime': 'deleted_time',
      'DeleterID': 'deleter_id',
      'CompanyID': 'company_id',
      'CustomerName': 'customer_name',
      'BusinessID': 'business_id',
      'OwnerName': 'owner_name',
      'PhoneNumber': 'phone_number',
      'FaxNumber': 'fax_number',
      'EmailAddress': 'email_address',
      'ContactName': 'contact_name',
      'Uptae': 'uptae',
      'Jongmok': 'jongmok',
      'Address': 'address',
      'Homepage': 'homepage',
      'Account': 'account',
      'Comment': 'comment',
      'Status': 'status',
      'RegisterID': 'register_id',
      'RegisterTime': 'register_time',
      'LastModifyID': 'last_modify_id',
      'LastModifyTime': 'last_modify_time',
      'Level1': 'level1',
      'Level2': 'level2',
      'Level3': 'level3',
      'Payment': 'payment',
      'IssueVAT': 'issue_vat',
    }
  },
  {
    order: '08',
    mysqlFile: 'shinbiseodb_Contracts.sql',
    mysqlTable: 'Contracts',
    pgTable: 'contracts',
    columns: {
      'SellerID': 'seller_id',
      'BuyerID': 'buyer_id',
      'CustomerID': 'customer_id',
      'SellerAlias': 'seller_alias',
      'RegisterTime': 'register_time',
    }
  },
  {
    order: '09',
    mysqlFile: 'shinbiseodb_Products.sql',
    mysqlTable: 'Products',
    pgTable: 'products',
    columns: {
      'SellerID': 'seller_id',
      'ProductID': 'product_id',
      'CategoryID': 'category_id',
      'Attribute01': 'attribute01',
      'Attribute02': 'attribute02',
      'Attribute03': 'attribute03',
      'Attribute04': 'attribute04',
      'Attribute05': 'attribute05',
      'Attribute06': 'attribute06',
      'Attribute07': 'attribute07',
      'Attribute08': 'attribute08',
      'Attribute09': 'attribute09',
      'Attribute10': 'attribute10',
      'UnitPrice01': 'unit_price01',
      'UnitPrice02': 'unit_price02',
      'UnitPrice03': 'unit_price03',
      'UnitPrice04': 'unit_price04',
      'UnitPrice05': 'unit_price05',
      'UnitPrice06': 'unit_price06',
      'UnitPrice07': 'unit_price07',
      'UnitPrice08': 'unit_price08',
      'UnitPrice09': 'unit_price09',
      'UnitPrice10': 'unit_price10',
      'UnitPrice11': 'unit_price11',
      'UnitPrice12': 'unit_price12',
      'UnitPrice13': 'unit_price13',
      'UnitPrice14': 'unit_price14',
      'UnitPrice15': 'unit_price15',
      'UnitPrice16': 'unit_price16',
      'UnitPrice17': 'unit_price17',
      'UnitPrice18': 'unit_price18',
      'UnitPrice19': 'unit_price19',
      'UnitPrice20': 'unit_price20',
      'RegisterID': 'register_id',
      'RegistTime': 'regist_time',
      'ModifierID': 'modifier_id',
      'ModifyTime': 'modify_time',
      'Stock': 'stock',
    }
  },
  {
    order: '10',
    mysqlFile: 'shinbiseodb_OrdersM.sql',
    mysqlTable: 'OrdersM',
    pgTable: 'orders_m',
    columns: {
      'SellerID': 'seller_id',
      'OrderID': 'order_id',
      'OrderDate': 'order_date',
      'CustomerID': 'customer_id',
      'ReadyMade': 'ready_made',
      'ItemCount': 'item_count',
      'SumAmount': 'sum_amount',
      'Adjustment': 'adjustment',
      'VAT': 'vat',
      'TotalAmount': 'total_amount',
      'PaymentMethod': 'payment_method',
      'PaymentDate': 'payment_date',
      'Comment': 'comment',
      'Status': 'status',
      'OrdererID': 'orderer_id',
      'OrderTime': 'order_time',
      'ReadyID': 'ready_id',
      'ReadyTime': 'ready_time',
      'ReceiveID': 'receive_id',
      'ReceiveTime': 'receive_time',
      'FinishID': 'finish_id',
      'FinishTime': 'finish_time',
      'CancelID': 'cancel_id',
      'CancelTime': 'cancel_time',
    }
  },
  {
    order: '11',
    mysqlFile: 'shinbiseodb_OrdersD.sql',
    mysqlTable: 'OrdersD',
    pgTable: 'orders_d',
    columns: {
      'SellerID': 'seller_id',
      'OrderID': 'order_id',
      'Sequence': 'sequence',
      'CategoryID': 'category_id',
      'Attribute01': 'attribute01',
      'Attribute02': 'attribute02',
      'Attribute03': 'attribute03',
      'Attribute04': 'attribute04',
      'Attribute05': 'attribute05',
      'Attribute06': 'attribute06',
      'Attribute07': 'attribute07',
      'Attribute08': 'attribute08',
      'Attribute09': 'attribute09',
      'Attribute10': 'attribute10',
      'Price': 'price',
      'Quantity': 'quantity',
      'Amount': 'amount',
      'VAT': 'vat',
      'Group': '"group"',  // PostgreSQL 예약어
      'Status': 'status',
    }
  },
  {
    order: '12',
    mysqlFile: 'shinbiseodb_TradingStubsM.sql',
    mysqlTable: 'TradingStubsM',
    pgTable: 'trading_stubs_m',
    columns: {
      'TsID': 'ts_id',
      'SellerID': 'seller_id',
      'OrderID': 'order_id',
      'CustomerID': 'customer_id',
      'IssueDate': 'issue_date',
      'ItemCount': 'item_count',
      'SumAmount': 'sum_amount',
      'SumVAT': 'sum_vat',
      'TotalAmount': 'total_amount',
      'PaymentMethod': 'payment_method',
      'Comment': 'comment',
      'Status': 'status',
      'IssuerID': 'issuer_id',
      'IssueTime': 'issue_time',
      'CancelerID': 'canceler_id',
      'CancelTime': 'cancel_time',
      'TaxInvoiceID': 'tax_invoice_id',
    }
  },
  {
    order: '13',
    mysqlFile: 'shinbiseodb_TradingStubsD.sql',
    mysqlTable: 'TradingStubsD',
    pgTable: 'trading_stubs_d',
    columns: {
      'TsID': 'ts_id',
      'Sequence': 'sequence',
      'CategoryID': 'category_id',
      'Description': 'description',
      'Standard': 'standard',
      'UnitPrice': 'unit_price',
      'Quantity': 'quantity',
      'Amount': 'amount',
      'VAT': 'vat',
      'DComment': 'd_comment',
    }
  },
]

// ========== 유틸 함수 ==========

/**
 * MySQL VALUES 문자열에서 개별 행 값을 파싱
 * 한 INSERT 문에 여러 행이 ),(로 구분됨
 */
function parseValuesFromInsert(insertLine) {
  // INSERT INTO `TableName` VALUES (...),(...),(...);
  const valuesMatch = insertLine.match(/VALUES\s+(.+);?\s*$/i)
  if (!valuesMatch) return []

  let valuesStr = valuesMatch[1]
  // 끝의 세미콜론 제거
  if (valuesStr.endsWith(';')) valuesStr = valuesStr.slice(0, -1)

  // 각 행 파싱: (...),(...) 형태
  const rows = []
  let current = ''
  let inQuote = false
  let depth = 0

  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i]
    const prev = i > 0 ? valuesStr[i - 1] : ''

    if (ch === "'" && prev !== '\\') {
      inQuote = !inQuote
      current += ch
    } else if (!inQuote && ch === '(') {
      depth++
      if (depth === 1) {
        current = ''
        continue
      }
      current += ch
    } else if (!inQuote && ch === ')') {
      depth--
      if (depth === 0) {
        rows.push(current)
        current = ''
      } else {
        current += ch
      }
    } else {
      if (depth > 0) current += ch
    }
  }

  return rows
}

/**
 * 행 값 문자열을 개별 값 배열로 파싱
 * 'value1','value2',NULL,123 형태
 */
function parseRowValues(rowStr) {
  const values = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < rowStr.length; i++) {
    const ch = rowStr[i]
    const prev = i > 0 ? rowStr[i - 1] : ''

    if (ch === "'" && prev !== '\\') {
      inQuote = !inQuote
      current += ch
    } else if (!inQuote && ch === ',') {
      values.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) values.push(current.trim())

  return values
}

/**
 * MySQL 값을 PostgreSQL 호환으로 변환
 */
function convertValue(val) {
  if (val === 'NULL') return 'NULL'

  // 문자열 값 ('...')
  if (val.startsWith("'") && val.endsWith("'")) {
    let inner = val.slice(1, -1)
    // MySQL escape: \' → ''
    inner = inner.replace(/\\'/g, "''")
    // MySQL escape: \\ → \
    inner = inner.replace(/\\\\/g, '\\')
    // MySQL escape: \" → "
    inner = inner.replace(/\\"/g, '"')
    // MySQL escape: \n → newline
    inner = inner.replace(/\\n/g, '\n')
    // MySQL escape: \r → 제거
    inner = inner.replace(/\\r/g, '')
    // MySQL escape: \0 → 제거
    inner = inner.replace(/\\0/g, '')

    // 0000-00-00 00:00:00 → NULL (PostgreSQL에서 유효하지 않은 날짜)
    if (inner === '0000-00-00 00:00:00') return 'NULL'

    // E'' escape 문자열 사용 (backslash가 포함된 경우)
    if (inner.includes('\\')) {
      return `E'${inner}'`
    }

    return `'${inner}'`
  }

  // 숫자 등 그대로
  return val
}

/**
 * 단일 테이블 변환
 */
function convertTable(config) {
  const inputPath = path.join(INPUT_DIR, config.mysqlFile)
  if (!fs.existsSync(inputPath)) {
    console.log(`  SKIP: ${config.mysqlFile} not found`)
    return
  }

  const content = fs.readFileSync(inputPath, 'utf8')

  // 모든 INSERT INTO 문을 찾아서 파싱
  const insertRegex = new RegExp(`INSERT INTO \\x60${config.mysqlTable}\\x60 VALUES\\s+`, 'gi')
  const rows = []
  let m
  while ((m = insertRegex.exec(content)) !== null) {
    // 이 INSERT 시작 위치부터 세미콜론까지 추출
    const startIdx = m.index
    let endIdx = startIdx
    let inQ = false
    for (let i = startIdx; i < content.length; i++) {
      const ch = content[i]
      const prev = i > 0 ? content[i - 1] : ''
      if (ch === "'" && prev !== '\\') inQ = !inQ
      if (!inQ && ch === ';') {
        endIdx = i + 1
        break
      }
    }
    const insertLine = content.substring(startIdx, endIdx)
    const parsed = parseValuesFromInsert(insertLine)
    rows.push(...parsed)
  }

  if (rows.length === 0) {
    console.log(`  SKIP: No data rows in ${config.mysqlFile}`)
    return
  }

  // PostgreSQL 컬럼 목록 생성 (MySQL CREATE TABLE 순서와 동일)
  const pgColumns = Object.values(config.columns)
  const columnList = pgColumns.join(', ')

  // 배치 크기 (대용량 테이블용)
  const BATCH_SIZE = 500
  const outputPath = path.join(OUTPUT_DIR, `${config.order}_${config.pgTable}.sql`)

  let output = `-- ${config.pgTable} (${rows.length} rows)\n`
  output += `-- Converted from ${config.mysqlFile}\n`
  output += `-- Generated: ${new Date().toISOString()}\n\n`

  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE)

    output += `INSERT INTO ${config.pgTable} (${columnList}) VALUES\n`

    const valueLines = batch.map(rowStr => {
      const vals = parseRowValues(rowStr)
      const converted = vals.map(v => convertValue(v))
      return `  (${converted.join(', ')})`
    })

    output += valueLines.join(',\n')
    output += `\nON CONFLICT DO NOTHING;\n\n`
  }

  fs.writeFileSync(outputPath, output, 'utf8')
  console.log(`  OK: ${config.pgTable} → ${rows.length} rows → ${config.order}_${config.pgTable}.sql`)
}

// ========== 메인 실행 ==========

console.log('=== MySQL → PostgreSQL 마이그레이션 변환 ===\n')
console.log(`Input:  ${INPUT_DIR}`)
console.log(`Output: ${OUTPUT_DIR}\n`)

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

for (const config of TABLE_CONFIGS) {
  console.log(`[${config.order}] ${config.mysqlTable} → ${config.pgTable}`)
  convertTable(config)
}

console.log('\n=== 변환 완료 ===')
console.log('\nSupabase SQL Editor에서 01 ~ 13 순서대로 실행하세요.')
console.log('주의: service_role_key로 실행해야 RLS를 우회합니다.')
