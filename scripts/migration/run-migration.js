/**
 * Supabase에 직접 SQL 실행하는 마이그레이션 스크립트
 *
 * 사용법: node scripts/migration/run-migration.js
 *
 * 기존 데이터를 삭제하고 전체 데이터를 한번에 INSERT합니다.
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://lwybphjhgdnprcaenqxl.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWJwaGpoZ2RucHJjYWVucXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgzMjcwOCwiZXhwIjoyMDg5NDA4NzA4fQ.iqToj29cpsXJ6Vl8bVXzl7yaiGT4rH268v_AciJ6MRw'

const OUTPUT_DIR = path.join(__dirname, 'output')

async function runSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  // REST API로는 raw SQL 실행이 안되므로 pg endpoint 사용
  // Supabase는 /pg/query 엔드포인트 제공 안함
  // 대신 supabase-js를 사용하거나 pg 직접 연결
  return res
}

// Supabase SQL API (Management API) 사용
async function executeSQLViaAPI(sql, label) {
  // Supabase에는 REST로 raw SQL을 실행할 수 있는 방법이 제한적
  // 대신 각 테이블별로 supabase-js의 insert를 사용
  console.log(`  ${label}...`)
}

// 변환된 SQL 파일을 읽어서 INSERT 문을 파싱 → supabase-js로 삽입
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * SQL INSERT 문에서 테이블명, 컬럼명, 값 배열을 추출
 */
function parseInsertSQL(sql) {
  const results = []
  // INSERT INTO table_name (col1, col2) VALUES\n  (v1, v2),\n  (v3, v4)\nON CONFLICT DO NOTHING;
  const insertRegex = /INSERT INTO (\w+) \(([^)]+)\) VALUES\n([\s\S]*?)ON CONFLICT DO NOTHING;/g
  let match
  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1]
    const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''))
    const valuesBlock = match[3]

    // 각 행 파싱
    const rows = []
    let current = ''
    let inQuote = false
    let escapeQuote = false
    let depth = 0

    for (let i = 0; i < valuesBlock.length; i++) {
      const ch = valuesBlock[i]
      const prev = i > 0 ? valuesBlock[i - 1] : ''

      // E'...' escape string 처리
      if (ch === "'" && prev !== '\\' && !(prev === "'" && escapeQuote)) {
        if (inQuote && i + 1 < valuesBlock.length && valuesBlock[i + 1] === "'") {
          // '' escape → 그대로 넘김
          escapeQuote = true
          current += ch
          continue
        }
        escapeQuote = false
        inQuote = !inQuote
        current += ch
      } else {
        escapeQuote = false
        if (!inQuote && ch === '(') {
          depth++
          if (depth === 1) { current = ''; continue }
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
    }

    // 각 행을 object로 변환
    for (const rowStr of rows) {
      const vals = parseRowValues(rowStr)
      const obj = {}
      columns.forEach((col, idx) => {
        const val = vals[idx]
        if (val === undefined || val === 'NULL') {
          obj[col] = null
        } else if (val.startsWith("'") || val.startsWith("E'")) {
          // 문자열
          let inner = val.startsWith("E'") ? val.slice(2, -1) : val.slice(1, -1)
          // PostgreSQL '' escape → '
          inner = inner.replace(/''/g, "'")
          obj[col] = inner
        } else {
          // 숫자
          const num = Number(val)
          obj[col] = isNaN(num) ? val : num
        }
      })
      results.push({ table, obj })
    }
  }
  return results
}

function parseRowValues(rowStr) {
  const values = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < rowStr.length; i++) {
    const ch = rowStr[i]
    const prev = i > 0 ? rowStr[i - 1] : ''

    if (ch === "'" && prev !== '\\') {
      // check for '' escape
      if (inQuote && i + 1 < rowStr.length && rowStr[i + 1] === "'") {
        current += ch
        continue
      }
      if (!inQuote && prev === "'") {
        // closing of '' escape
        current += ch
        continue
      }
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

// 실행 순서 (의존성 순서)
const FILES_IN_ORDER = [
  '01_categories.sql',
  '02_companies.sql',
  // 03 companies_deleted - skip if empty
  '04_users.sql',
  '05_users_deleted.sql',
  '06_customers.sql',
  // 07 customers_deleted - skip if empty
  '08_contracts.sql',
  '09_products.sql',
  '10_orders_m.sql',
  '11_orders_d.sql',
  '12_trading_stubs_m.sql',
  '13_trading_stubs_d.sql',
]

// 삭제 순서 (역순, FK 의존성 고려)
const DELETE_ORDER = [
  'trading_stubs_d',
  'trading_stubs_m',
  'orders_d',
  'orders_m',
  'products',
  'contracts',
  'customers_deleted',
  'customers',
  'users_deleted',
  'users',
  'companies_deleted',
  'companies',
  'categories',
]

async function main() {
  console.log('=== Supabase 마이그레이션 실행 ===\n')

  // 1. 기존 데이터 삭제 (역순)
  console.log('[1] 기존 데이터 삭제...')
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().neq('seller_id' in {} ? 'seller_id' : 'dummycol', '___never_match___')
    // delete all: gte trick
    // supabase-js doesn't support DELETE without filter, use RPC or raw
  }

  // supabase-js는 조건 없는 DELETE를 허용하지 않으므로 다른 방식 사용
  // 각 테이블에서 모든 행을 삭제하려면 .delete().gte('id', '') 같은 트릭 필요
  // 대신 truncate를 RPC로 실행

  // RPC 함수가 없으므로 테이블별 PK 기준으로 삭제
  const pkMap = {
    'trading_stubs_d': { col: 'ts_id', op: 'neq', val: '___' },
    'trading_stubs_m': { col: 'ts_id', op: 'neq', val: '___' },
    'orders_d': { col: 'order_id', op: 'neq', val: '___' },
    'orders_m': { col: 'order_id', op: 'neq', val: '___' },
    'products': { col: 'seller_id', op: 'neq', val: '___' },
    'contracts': { col: 'seller_id', op: 'neq', val: '___' },
    'customers_deleted': { col: 'seller_id', op: 'neq', val: '___' },
    'customers': { col: 'seller_id', op: 'neq', val: '___' },
    'users_deleted': { col: 'user_id', op: 'neq', val: '___' },
    'users': { col: 'user_id', op: 'neq', val: '___' },
    'companies_deleted': { col: 'company_id', op: 'neq', val: '___' },
    'companies': { col: 'company_id', op: 'neq', val: '___' },
    'categories': { col: 'category_id', op: 'neq', val: '___' },
  }

  for (const table of DELETE_ORDER) {
    const pk = pkMap[table]
    if (!pk) continue
    const { error } = await supabase.from(table).delete().neq(pk.col, pk.val)
    if (error) {
      console.log(`  DELETE ${table}: ${error.message}`)
    } else {
      console.log(`  DELETE ${table}: OK`)
    }
  }

  // 2. 파일별 INSERT 실행
  console.log('\n[2] 데이터 INSERT...')

  for (const file of FILES_IN_ORDER) {
    const filePath = path.join(OUTPUT_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${file} not found`)
      continue
    }

    const sql = fs.readFileSync(filePath, 'utf8')
    const records = parseInsertSQL(sql)

    if (records.length === 0) {
      console.log(`  SKIP: ${file} (0 rows)`)
      continue
    }

    const table = records[0].table
    const objects = records.map(r => r.obj)

    // 배치 삽입 (1000건씩)
    const BATCH = 1000
    let inserted = 0
    let errors = 0

    for (let i = 0; i < objects.length; i += BATCH) {
      const batch = objects.slice(i, i + BATCH)
      const { error } = await supabase.from(table).insert(batch)
      if (error) {
        console.log(`  ERROR ${file} batch ${Math.floor(i/BATCH)+1}: ${error.message}`)
        errors++
        // 개별 삽입 시도
        for (const obj of batch) {
          const { error: singleErr } = await supabase.from(table).insert(obj)
          if (!singleErr) inserted++
        }
      } else {
        inserted += batch.length
      }
    }

    console.log(`  ${file}: ${inserted}/${objects.length} rows${errors ? ` (${errors} batch errors)` : ''}`)
  }

  console.log('\n=== 마이그레이션 완료 ===')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
