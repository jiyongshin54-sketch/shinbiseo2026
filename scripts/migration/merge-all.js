/**
 * 모든 마이그레이션 SQL을 하나의 파일로 합침
 * 기존 데이터 DELETE + INSERT 순서대로
 */
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, 'output')
const MERGED_FILE = path.join(__dirname, 'full_migration.sql')

// 삭제 순서 (FK 역순)
const DELETE_TABLES = [
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

// INSERT 파일 순서
const INSERT_FILES = [
  '01_categories.sql',
  '02_companies.sql',
  '04_users.sql',
  '05_users_deleted.sql',
  '06_customers.sql',
  '08_contracts.sql',
  '09_products.sql',
  '10_orders_m.sql',
  '11_orders_d.sql',
  '12_trading_stubs_m.sql',
  '13_trading_stubs_d.sql',
]

let output = '-- Full Migration: MySQL → PostgreSQL (Supabase)\n'
output += `-- Generated: ${new Date().toISOString()}\n\n`

// DELETE 구문
output += '-- ========== 기존 데이터 삭제 ==========\n\n'
for (const table of DELETE_TABLES) {
  output += `DELETE FROM ${table};\n`
}
output += '\n'

// INSERT 구문
output += '-- ========== 데이터 INSERT ==========\n\n'
for (const file of INSERT_FILES) {
  const filePath = path.join(OUTPUT_DIR, file)
  if (!fs.existsSync(filePath)) continue
  const content = fs.readFileSync(filePath, 'utf8')
  output += content + '\n'
}

fs.writeFileSync(MERGED_FILE, output, 'utf8')
const sizeMB = (fs.statSync(MERGED_FILE).size / 1024 / 1024).toFixed(1)
console.log(`완료: ${MERGED_FILE} (${sizeMB}MB)`)
