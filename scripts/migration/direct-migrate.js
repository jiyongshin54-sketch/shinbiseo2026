/**
 * MySQL → Supabase PostgreSQL 직접 마이그레이션
 * pg 모듈로 DB 직접 연결하여 INSERT
 *
 * 사용법: node scripts/migration/direct-migrate.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const INPUT_DIR = 'D:/db20260320'

const DB_URL = 'postgresql://postgres:Smartandy623!!@db.lwybphjhgdnprcaenqxl.supabase.co:5432/postgres'

// 테이블 설정 (의존성 순서)
const TABLE_CONFIGS = [
  {
    order: '01', mysqlFile: 'shinbiseodb_Categories.sql', mysqlTable: 'Categories', pgTable: 'categories',
    columns: { 'CategoryID': 'category_id', 'CategoryL': 'category_l', 'CategoryM': 'category_m', 'CategoryS': 'category_s' }
  },
  {
    order: '02', mysqlFile: 'shinbiseodb_Companies.sql', mysqlTable: 'Companies', pgTable: 'companies',
    columns: { 'CompanyID': 'company_id', 'CompanyName': 'company_name', 'BusinessID': 'business_id', 'OwnerName': 'owner_name', 'PhoneNumber': 'phone_number', 'FaxNumber': 'fax_number', 'EmailAddress': 'email_address', 'ContactID': 'contact_id', 'Uptae': 'uptae', 'Jongmok': 'jongmok', 'Address': 'address', 'Homepage': 'homepage', 'Account': 'account', 'Comment': 'comment', 'Power': 'power', 'Status': 'status', 'RequestTime': 'request_time', 'ApproveID': 'approve_id', 'ApproveTime': 'approve_time', 'CompanyAlias': 'company_alias', 'IssueTI': 'issue_ti' }
  },
  {
    order: '03', mysqlFile: 'shinbiseodb_CompaniesDeleted.sql', mysqlTable: 'CompaniesDeleted', pgTable: 'companies_deleted',
    columns: { 'CompanyID': 'company_id', 'DeletedTime': 'deleted_time', 'DeleterID': 'deleter_id', 'CompanyName': 'company_name', 'BusinessID': 'business_id', 'OwnerName': 'owner_name', 'PhoneNumber': 'phone_number', 'FaxNumber': 'fax_number', 'EmailAddress': 'email_address', 'ContactID': 'contact_id', 'Uptae': 'uptae', 'Jongmok': 'jongmok', 'Address': 'address', 'Homepage': 'homepage', 'Account': 'account', 'Comment': 'comment', 'Power': 'power', 'Status': 'status', 'RequestTime': 'request_time', 'ApproveID': 'approve_id', 'ApproveTime': 'approve_time', 'CompanyAlias': 'company_alias' }
  },
  {
    order: '04', mysqlFile: 'shinbiseodb_Users.sql', mysqlTable: 'Users', pgTable: 'users',
    columns: { 'UserID': 'user_id', 'UserName': 'user_name', 'MobileNumber': 'mobile_number', 'CompanyID': 'company_id', 'Power': 'power', 'Status': 'status', 'RequestTime': 'request_time', 'ApproveID': 'approve_id', 'ApproveTime': 'approve_time', 'EmailAddress': 'email_address' }
  },
  {
    order: '05', mysqlFile: 'shinbiseodb_UsersDeleted.sql', mysqlTable: 'UsersDeleted', pgTable: 'users_deleted',
    columns: { 'UserID': 'user_id', 'DeletedTime': 'deleted_time', 'DeleterID': 'deleter_id', 'UserName': 'user_name', 'MobileNumber': 'mobile_number', 'CompanyID': 'company_id', 'Power': 'power', 'Status': 'status', 'RequestTime': 'request_time', 'ApproveID': 'approve_id', 'ApproveTime': 'approve_time' }
  },
  {
    order: '06', mysqlFile: 'shinbiseodb_Customers.sql', mysqlTable: 'Customers', pgTable: 'customers',
    columns: { 'SellerID': 'seller_id', 'CustomerID': 'customer_id', 'CompanyID': 'company_id', 'CustomerName': 'customer_name', 'BusinessID': 'business_id', 'OwnerName': 'owner_name', 'PhoneNumber': 'phone_number', 'FaxNumber': 'fax_number', 'EmailAddress': 'email_address', 'ContactName': 'contact_name', 'Uptae': 'uptae', 'Jongmok': 'jongmok', 'Address': 'address', 'Homepage': 'homepage', 'Account': 'account', 'Comment': 'comment', 'Status': 'status', 'RegisterID': 'register_id', 'RegisterTime': 'register_time', 'LastModifyID': 'last_modify_id', 'LastModifyTime': 'last_modify_time', 'Level1': 'level1', 'Level2': 'level2', 'Level3': 'level3', 'Payment': 'payment', 'IssueVAT': 'issue_vat' }
  },
  {
    order: '07', mysqlFile: 'shinbiseodb_CustomersDeleted.sql', mysqlTable: 'CustomersDeleted', pgTable: 'customers_deleted',
    columns: { 'SellerID': 'seller_id', 'CustomerID': 'customer_id', 'DeletedTime': 'deleted_time', 'DeleterID': 'deleter_id', 'CompanyID': 'company_id', 'CustomerName': 'customer_name', 'BusinessID': 'business_id', 'OwnerName': 'owner_name', 'PhoneNumber': 'phone_number', 'FaxNumber': 'fax_number', 'EmailAddress': 'email_address', 'ContactName': 'contact_name', 'Uptae': 'uptae', 'Jongmok': 'jongmok', 'Address': 'address', 'Homepage': 'homepage', 'Account': 'account', 'Comment': 'comment', 'Status': 'status', 'RegisterID': 'register_id', 'RegisterTime': 'register_time', 'LastModifyID': 'last_modify_id', 'LastModifyTime': 'last_modify_time', 'Level1': 'level1', 'Level2': 'level2', 'Level3': 'level3', 'Payment': 'payment', 'IssueVAT': 'issue_vat' }
  },
  {
    order: '08', mysqlFile: 'shinbiseodb_Contracts.sql', mysqlTable: 'Contracts', pgTable: 'contracts',
    columns: { 'SellerID': 'seller_id', 'BuyerID': 'buyer_id', 'CustomerID': 'customer_id', 'SellerAlias': 'seller_alias', 'RegisterTime': 'register_time' }
  },
  {
    order: '09', mysqlFile: 'shinbiseodb_Products.sql', mysqlTable: 'Products', pgTable: 'products',
    columns: { 'SellerID': 'seller_id', 'ProductID': 'product_id', 'CategoryID': 'category_id', 'Attribute01': 'attribute01', 'Attribute02': 'attribute02', 'Attribute03': 'attribute03', 'Attribute04': 'attribute04', 'Attribute05': 'attribute05', 'Attribute06': 'attribute06', 'Attribute07': 'attribute07', 'Attribute08': 'attribute08', 'Attribute09': 'attribute09', 'Attribute10': 'attribute10', 'UnitPrice01': 'unit_price01', 'UnitPrice02': 'unit_price02', 'UnitPrice03': 'unit_price03', 'UnitPrice04': 'unit_price04', 'UnitPrice05': 'unit_price05', 'UnitPrice06': 'unit_price06', 'UnitPrice07': 'unit_price07', 'UnitPrice08': 'unit_price08', 'UnitPrice09': 'unit_price09', 'UnitPrice10': 'unit_price10', 'UnitPrice11': 'unit_price11', 'UnitPrice12': 'unit_price12', 'UnitPrice13': 'unit_price13', 'UnitPrice14': 'unit_price14', 'UnitPrice15': 'unit_price15', 'UnitPrice16': 'unit_price16', 'UnitPrice17': 'unit_price17', 'UnitPrice18': 'unit_price18', 'UnitPrice19': 'unit_price19', 'UnitPrice20': 'unit_price20', 'RegisterID': 'register_id', 'RegistTime': 'regist_time', 'ModifierID': 'modifier_id', 'ModifyTime': 'modify_time', 'Stock': 'stock' }
  },
  {
    order: '10', mysqlFile: 'shinbiseodb_OrdersM.sql', mysqlTable: 'OrdersM', pgTable: 'orders_m',
    columns: { 'SellerID': 'seller_id', 'OrderID': 'order_id', 'OrderDate': 'order_date', 'CustomerID': 'customer_id', 'ReadyMade': 'ready_made', 'ItemCount': 'item_count', 'SumAmount': 'sum_amount', 'Adjustment': 'adjustment', 'VAT': 'vat', 'TotalAmount': 'total_amount', 'PaymentMethod': 'payment_method', 'PaymentDate': 'payment_date', 'Comment': 'comment', 'Status': 'status', 'OrdererID': 'orderer_id', 'OrderTime': 'order_time', 'ReadyID': 'ready_id', 'ReadyTime': 'ready_time', 'ReceiveID': 'receive_id', 'ReceiveTime': 'receive_time', 'FinishID': 'finish_id', 'FinishTime': 'finish_time', 'CancelID': 'cancel_id', 'CancelTime': 'cancel_time' }
  },
  {
    order: '11', mysqlFile: 'shinbiseodb_OrdersD.sql', mysqlTable: 'OrdersD', pgTable: 'orders_d',
    columns: { 'SellerID': 'seller_id', 'OrderID': 'order_id', 'Sequence': 'sequence', 'CategoryID': 'category_id', 'Attribute01': 'attribute01', 'Attribute02': 'attribute02', 'Attribute03': 'attribute03', 'Attribute04': 'attribute04', 'Attribute05': 'attribute05', 'Attribute06': 'attribute06', 'Attribute07': 'attribute07', 'Attribute08': 'attribute08', 'Attribute09': 'attribute09', 'Attribute10': 'attribute10', 'Price': 'price', 'Quantity': 'quantity', 'Amount': 'amount', 'VAT': 'vat', 'Group': '"group"', 'Status': 'status' }
  },
  {
    order: '12', mysqlFile: 'shinbiseodb_TradingStubsM.sql', mysqlTable: 'TradingStubsM', pgTable: 'trading_stubs_m',
    columns: { 'TsID': 'ts_id', 'SellerID': 'seller_id', 'OrderID': 'order_id', 'CustomerID': 'customer_id', 'IssueDate': 'issue_date', 'ItemCount': 'item_count', 'SumAmount': 'sum_amount', 'SumVAT': 'sum_vat', 'TotalAmount': 'total_amount', 'PaymentMethod': 'payment_method', 'Comment': 'comment', 'Status': 'status', 'IssuerID': 'issuer_id', 'IssueTime': 'issue_time', 'CancelerID': 'canceler_id', 'CancelTime': 'cancel_time', 'TaxInvoiceID': 'tax_invoice_id' }
  },
  {
    order: '13', mysqlFile: 'shinbiseodb_TradingStubsD.sql', mysqlTable: 'TradingStubsD', pgTable: 'trading_stubs_d',
    columns: { 'TsID': 'ts_id', 'Sequence': 'sequence', 'CategoryID': 'category_id', 'Description': 'description', 'Standard': 'standard', 'UnitPrice': 'unit_price', 'Quantity': 'quantity', 'Amount': 'amount', 'VAT': 'vat', 'DComment': 'd_comment' }
  },
]

// ========== MySQL 파싱 ==========

function parseValuesFromInsert(insertLine) {
  const valuesMatch = insertLine.match(/VALUES\s+(.+);?\s*$/is)
  if (!valuesMatch) return []

  let valuesStr = valuesMatch[1]
  if (valuesStr.endsWith(';')) valuesStr = valuesStr.slice(0, -1)

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
      if (depth === 1) { current = ''; continue }
      current += ch
    } else if (!inQuote && ch === ')') {
      depth--
      if (depth === 0) { rows.push(current); current = '' }
      else current += ch
    } else {
      if (depth > 0) current += ch
    }
  }
  return rows
}

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

function convertToJsValue(val) {
  if (val === 'NULL') return null
  if (val.startsWith("'") && val.endsWith("'")) {
    let inner = val.slice(1, -1)
    inner = inner.replace(/\\'/g, "'")
    inner = inner.replace(/\\\\/g, '\\')
    inner = inner.replace(/\\"/g, '"')
    inner = inner.replace(/\\n/g, '\n')
    inner = inner.replace(/\\r/g, '')
    inner = inner.replace(/\\0/g, '')
    if (inner === '0000-00-00 00:00:00') return null
    return inner
  }
  // 숫자
  if (!isNaN(val) && val !== '') return val
  return val
}

function parseFile(config) {
  const inputPath = path.join(INPUT_DIR, config.mysqlFile)
  if (!fs.existsSync(inputPath)) {
    console.log(`  SKIP: ${config.mysqlFile} not found`)
    return []
  }

  const content = fs.readFileSync(inputPath, 'utf8')
  const allRows = []

  // INSERT INTO 문 찾기
  const regex = new RegExp(`INSERT INTO \\x60${config.mysqlTable}\\x60 VALUES`, 'gi')
  let m
  while ((m = regex.exec(content)) !== null) {
    const startIdx = m.index
    let endIdx = startIdx
    let inQ = false
    for (let i = startIdx; i < content.length; i++) {
      const ch = content[i]
      const prev = i > 0 ? content[i - 1] : ''
      if (ch === "'" && prev !== '\\') inQ = !inQ
      if (!inQ && ch === ';') { endIdx = i + 1; break }
    }
    const insertLine = content.substring(startIdx, endIdx)
    const parsed = parseValuesFromInsert(insertLine)
    allRows.push(...parsed)
  }

  return allRows
}

// ========== 메인 ==========

async function main() {
  console.log('=== MySQL → Supabase 직접 마이그레이션 ===\n')

  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('DB 연결 성공!\n')

    // FK 제약 임시 비활성화
    console.log('FK 제약 비활성화...')
    await client.query('SET session_replication_role = replica;')

    // 의존성 역순으로 DELETE (자식 먼저)
    const deleteOrder = [...TABLE_CONFIGS].reverse()
    for (const config of deleteOrder) {
      await client.query(`DELETE FROM ${config.pgTable}`)
    }
    console.log('기존 데이터 전체 삭제 완료\n')

    for (const config of TABLE_CONFIGS) {
      console.log(`[${config.order}] ${config.mysqlTable} → ${config.pgTable}`)

      // 이미 위에서 전체 삭제됨

      const rows = parseFile(config)
      if (rows.length === 0) {
        console.log(`  SKIP: No data`)
        continue
      }

      const pgColumns = Object.values(config.columns)
      const colCount = pgColumns.length

      // 컬럼 이름에서 예약어 처리된 쌍따옴표 유지
      const columnList = pgColumns.join(', ')

      // 배치 INSERT (100건씩)
      const BATCH = 100
      let inserted = 0
      let skipped = 0

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH)
        const values = []
        const params = []
        let paramIdx = 1

        for (const rowStr of batch) {
          const vals = parseRowValues(rowStr)

          // users 테이블: company_id가 'ERROR'인 행 건너뛰기
          if (config.pgTable === 'users') {
            const companyIdIdx = Object.keys(config.columns).indexOf('CompanyID')
            if (companyIdIdx >= 0) {
              const companyVal = convertToJsValue(vals[companyIdIdx])
              if (companyVal === 'ERROR') {
                skipped++
                continue
              }
            }
          }

          if (vals.length !== colCount) {
            console.log(`  WARNING: Row has ${vals.length} cols, expected ${colCount}. Skipping.`)
            skipped++
            continue
          }

          const placeholders = []
          for (const v of vals) {
            const jsVal = convertToJsValue(v)
            params.push(jsVal)
            placeholders.push(`$${paramIdx++}`)
          }
          values.push(`(${placeholders.join(', ')})`)
        }

        if (values.length > 0) {
          const sql = `INSERT INTO ${config.pgTable} (${columnList}) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`
          try {
            const result = await client.query(sql, params)
            inserted += result.rowCount
          } catch (err) {
            console.log(`  ERROR at batch ${i}: ${err.message}`)
            // 배치 실패 시 개별 INSERT로 재시도
            for (let j = 0; j < batch.length; j++) {
              const vals = parseRowValues(batch[j])
              if (vals.length !== colCount) continue

              const singleParams = vals.map(v => convertToJsValue(v))
              const singlePlaceholders = singleParams.map((_, idx) => `$${idx + 1}`)
              const singleSql = `INSERT INTO ${config.pgTable} (${columnList}) VALUES (${singlePlaceholders.join(', ')}) ON CONFLICT DO NOTHING`
              try {
                const r = await client.query(singleSql, singleParams)
                inserted += r.rowCount
              } catch (e2) {
                console.log(`  SKIP ROW: ${e2.message.substring(0, 80)}`)
                skipped++
              }
            }
          }
        }
      }

      console.log(`  완료: ${inserted}건 INSERT, ${skipped}건 SKIP (총 ${rows.length}건 파싱)\n`)
    }

    // FK 제약 다시 활성화
    await client.query('SET session_replication_role = DEFAULT;')
    console.log('FK 제약 다시 활성화\n')

    // auth_uid 복원 (기존 매핑된 사용자)
    // 118327249340093181436 → a2ca21ba-b656-485d-8792-892c7ade963e
    await client.query(`UPDATE users SET auth_uid = 'a2ca21ba-b656-485d-8792-892c7ade963e' WHERE user_id = '118327249340093181436'`)
    console.log('auth_uid 매핑 복원 완료\n')

    // 최종 카운트 확인
    console.log('=== 최종 확인 ===')
    for (const config of TABLE_CONFIGS) {
      const res = await client.query(`SELECT COUNT(*) as cnt FROM ${config.pgTable}`)
      console.log(`  ${config.pgTable}: ${res.rows[0].cnt}건`)
    }

  } catch (err) {
    console.error('ERROR:', err.message)
  } finally {
    await client.end()
    console.log('\nDB 연결 종료')
  }
}

main()
