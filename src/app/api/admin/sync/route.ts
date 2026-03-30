import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import mysql from 'mysql2/promise'

// PascalCase(MySQL) → snake_case(Supabase) 컬럼 매핑
const TABLE_CONFIGS = [
  {
    mysqlTable: 'Categories', pgTable: 'categories', pk: ['category_id'],
    timestampCol: null,
    columns: { CategoryID: 'category_id', CategoryL: 'category_l', CategoryM: 'category_m', CategoryS: 'category_s' },
  },
  {
    mysqlTable: 'Companies', pgTable: 'companies', pk: ['company_id'],
    timestampCol: 'ApproveTime',
    columns: { CompanyID: 'company_id', CompanyName: 'company_name', BusinessID: 'business_id', OwnerName: 'owner_name', PhoneNumber: 'phone_number', FaxNumber: 'fax_number', EmailAddress: 'email_address', ContactID: 'contact_id', Uptae: 'uptae', Jongmok: 'jongmok', Address: 'address', Homepage: 'homepage', Account: 'account', Comment: 'comment', Power: 'power', Status: 'status', RequestTime: 'request_time', ApproveID: 'approve_id', ApproveTime: 'approve_time', CompanyAlias: 'company_alias', IssueTI: 'issue_ti' },
  },
  {
    mysqlTable: 'CompaniesDeleted', pgTable: 'companies_deleted', pk: ['company_id', 'deleted_time'],
    timestampCol: 'DeletedTime',
    columns: { CompanyID: 'company_id', DeletedTime: 'deleted_time', DeleterID: 'deleter_id', CompanyName: 'company_name', BusinessID: 'business_id', OwnerName: 'owner_name', PhoneNumber: 'phone_number', FaxNumber: 'fax_number', EmailAddress: 'email_address', ContactID: 'contact_id', Uptae: 'uptae', Jongmok: 'jongmok', Address: 'address', Homepage: 'homepage', Account: 'account', Comment: 'comment', Power: 'power', Status: 'status', RequestTime: 'request_time', ApproveID: 'approve_id', ApproveTime: 'approve_time', CompanyAlias: 'company_alias' },
  },
  {
    mysqlTable: 'Users', pgTable: 'users', pk: ['user_id'],
    timestampCol: 'ApproveTime',
    // auth_uid, is_admin은 Supabase 전용 필드 — 동기화하지 않음
    columns: { UserID: 'user_id', UserName: 'user_name', MobileNumber: 'mobile_number', CompanyID: 'company_id', Power: 'power', Status: 'status', RequestTime: 'request_time', ApproveID: 'approve_id', ApproveTime: 'approve_time', EmailAddress: 'email_address' },
    preserveColumns: ['auth_uid', 'is_admin'], // UPDATE 시 덮어쓰지 않을 컬럼
  },
  {
    mysqlTable: 'UsersDeleted', pgTable: 'users_deleted', pk: ['user_id', 'deleted_time'],
    timestampCol: 'DeletedTime',
    columns: { UserID: 'user_id', DeletedTime: 'deleted_time', DeleterID: 'deleter_id', UserName: 'user_name', MobileNumber: 'mobile_number', CompanyID: 'company_id', Power: 'power', Status: 'status', RequestTime: 'request_time', ApproveID: 'approve_id', ApproveTime: 'approve_time' },
  },
  {
    mysqlTable: 'Customers', pgTable: 'customers', pk: ['seller_id', 'customer_id'],
    timestampCol: 'LastModifyTime',
    columns: { SellerID: 'seller_id', CustomerID: 'customer_id', CompanyID: 'company_id', CustomerName: 'customer_name', BusinessID: 'business_id', OwnerName: 'owner_name', PhoneNumber: 'phone_number', FaxNumber: 'fax_number', EmailAddress: 'email_address', ContactName: 'contact_name', Uptae: 'uptae', Jongmok: 'jongmok', Address: 'address', Homepage: 'homepage', Account: 'account', Comment: 'comment', Status: 'status', RegisterID: 'register_id', RegisterTime: 'register_time', LastModifyID: 'last_modify_id', LastModifyTime: 'last_modify_time', Level1: 'level1', Level2: 'level2', Level3: 'level3', Payment: 'payment', IssueVAT: 'issue_vat' },
  },
  {
    mysqlTable: 'CustomersDeleted', pgTable: 'customers_deleted', pk: ['seller_id', 'customer_id', 'deleted_time'],
    timestampCol: 'DeletedTime',
    columns: { SellerID: 'seller_id', CustomerID: 'customer_id', DeletedTime: 'deleted_time', DeleterID: 'deleter_id', CompanyID: 'company_id', CustomerName: 'customer_name', BusinessID: 'business_id', OwnerName: 'owner_name', PhoneNumber: 'phone_number', FaxNumber: 'fax_number', EmailAddress: 'email_address', ContactName: 'contact_name', Uptae: 'uptae', Jongmok: 'jongmok', Address: 'address', Homepage: 'homepage', Account: 'account', Comment: 'comment', Status: 'status', RegisterID: 'register_id', RegisterTime: 'register_time', LastModifyID: 'last_modify_id', LastModifyTime: 'last_modify_time', Level1: 'level1', Level2: 'level2', Level3: 'level3', Payment: 'payment', IssueVAT: 'issue_vat' },
  },
  {
    mysqlTable: 'Contracts', pgTable: 'contracts', pk: ['seller_id', 'buyer_id'],
    timestampCol: 'RegisterTime',
    columns: { SellerID: 'seller_id', BuyerID: 'buyer_id', CustomerID: 'customer_id', SellerAlias: 'seller_alias', RegisterTime: 'register_time' },
  },
  {
    mysqlTable: 'Products', pgTable: 'products', pk: ['seller_id', 'product_id'],
    timestampCol: 'ModifyTime',
    columns: { SellerID: 'seller_id', ProductID: 'product_id', CategoryID: 'category_id', Attribute01: 'attribute01', Attribute02: 'attribute02', Attribute03: 'attribute03', Attribute04: 'attribute04', Attribute05: 'attribute05', Attribute06: 'attribute06', Attribute07: 'attribute07', Attribute08: 'attribute08', Attribute09: 'attribute09', Attribute10: 'attribute10', UnitPrice01: 'unit_price01', UnitPrice02: 'unit_price02', UnitPrice03: 'unit_price03', UnitPrice04: 'unit_price04', UnitPrice05: 'unit_price05', UnitPrice06: 'unit_price06', UnitPrice07: 'unit_price07', UnitPrice08: 'unit_price08', UnitPrice09: 'unit_price09', UnitPrice10: 'unit_price10', UnitPrice11: 'unit_price11', UnitPrice12: 'unit_price12', UnitPrice13: 'unit_price13', UnitPrice14: 'unit_price14', UnitPrice15: 'unit_price15', UnitPrice16: 'unit_price16', UnitPrice17: 'unit_price17', UnitPrice18: 'unit_price18', UnitPrice19: 'unit_price19', UnitPrice20: 'unit_price20', RegisterID: 'register_id', RegistTime: 'regist_time', ModifierID: 'modifier_id', ModifyTime: 'modify_time', Stock: 'stock', Status: 'status' },
  },
  {
    mysqlTable: 'OrdersM', pgTable: 'orders_m', pk: ['seller_id', 'order_id'],
    timestampCol: 'OrderTime',
    columns: { SellerID: 'seller_id', OrderID: 'order_id', OrderDate: 'order_date', CustomerID: 'customer_id', ReadyMade: 'ready_made', ItemCount: 'item_count', SumAmount: 'sum_amount', Adjustment: 'adjustment', VAT: 'vat', TotalAmount: 'total_amount', PaymentMethod: 'payment_method', PaymentDate: 'payment_date', Comment: 'comment', Status: 'status', OrdererID: 'orderer_id', OrderTime: 'order_time', ReadyID: 'ready_id', ReadyTime: 'ready_time', ReceiveID: 'receive_id', ReceiveTime: 'receive_time', FinishID: 'finish_id', FinishTime: 'finish_time', CancelID: 'cancel_id', CancelTime: 'cancel_time' },
  },
  {
    mysqlTable: 'OrdersD', pgTable: 'orders_d', pk: ['seller_id', 'order_id', 'sequence'],
    timestampCol: null, // orders_m과 연동
    parentTable: 'OrdersM', parentTimestampCol: 'OrderTime', parentJoinKey: { mysql: 'OrderID', local: 'OrderID' },
    columns: { SellerID: 'seller_id', OrderID: 'order_id', Sequence: 'sequence', CategoryID: 'category_id', Attribute01: 'attribute01', Attribute02: 'attribute02', Attribute03: 'attribute03', Attribute04: 'attribute04', Attribute05: 'attribute05', Attribute06: 'attribute06', Attribute07: 'attribute07', Attribute08: 'attribute08', Attribute09: 'attribute09', Attribute10: 'attribute10', Price: 'price', Quantity: 'quantity', Amount: 'amount', VAT: 'vat', 'Group': '"group"', Status: 'status' },
  },
  {
    mysqlTable: 'TradingStubsM', pgTable: 'trading_stubs_m', pk: ['ts_id'],
    timestampCol: 'IssueTime',
    columns: { TsID: 'ts_id', SellerID: 'seller_id', OrderID: 'order_id', CustomerID: 'customer_id', IssueDate: 'issue_date', ItemCount: 'item_count', SumAmount: 'sum_amount', SumVAT: 'sum_vat', TotalAmount: 'total_amount', PaymentMethod: 'payment_method', Comment: 'comment', Status: 'status', IssuerID: 'issuer_id', IssueTime: 'issue_time', CancelerID: 'canceler_id', CancelTime: 'cancel_time', TaxInvoiceID: 'tax_invoice_id' },
  },
  {
    mysqlTable: 'TradingStubsD', pgTable: 'trading_stubs_d', pk: ['ts_id', 'sequence'],
    timestampCol: null, // trading_stubs_m과 연동
    parentTable: 'TradingStubsM', parentTimestampCol: 'IssueTime', parentJoinKey: { mysql: 'TsID', local: 'TsID' },
    columns: { TsID: 'ts_id', Sequence: 'sequence', CategoryID: 'category_id', Description: 'description', Standard: 'standard', UnitPrice: 'unit_price', Quantity: 'quantity', Amount: 'amount', VAT: 'vat', DComment: 'd_comment' },
  },
]

type TableConfig = typeof TABLE_CONFIGS[number]

function getMysqlConnection() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    charset: 'utf8mb4',
    dateStrings: false,
    timezone: '+09:00',
  })
}

function convertValue(val: unknown): unknown {
  if (val === null || val === undefined) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime()) || val.getFullYear() <= 1970) return null
    return val.toISOString()
  }
  if (typeof val === 'string' && val.startsWith('0000-00-00')) return null
  return val
}

function mapRow(mysqlRow: Record<string, unknown>, columns: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [mysqlCol, pgCol] of Object.entries(columns)) {
    const cleanPgCol = pgCol.replace(/"/g, '')
    mapped[cleanPgCol] = convertValue(mysqlRow[mysqlCol])
  }
  return mapped
}

async function syncTable(
  mysqlConn: mysql.Connection,
  supabase: ReturnType<typeof createAdminClient>,
  config: TableConfig,
  mode: 'full' | 'incremental',
  lastSyncTime: string | null,
): Promise<{ table: string; synced: number; error?: string }> {
  const mysqlCols = Object.keys(config.columns)
  const selectCols = mysqlCols.map(c => `\`${c}\``).join(', ')

  let query = `SELECT ${selectCols} FROM \`${config.mysqlTable}\``
  const queryParams: unknown[] = []

  // 변경분 모드: 타임스탬프 필터
  if (mode === 'incremental' && lastSyncTime) {
    if (config.timestampCol) {
      query += ` WHERE \`${config.timestampCol}\` > ?`
      queryParams.push(lastSyncTime)
    } else if ((config as any).parentTable && (config as any).parentTimestampCol) {
      // 부모 테이블의 타임스탬프로 필터 (OrdersD, TradingStubsD)
      const parent = config as any
      query += ` WHERE \`${parent.parentJoinKey.local}\` IN (SELECT \`${parent.parentJoinKey.mysql}\` FROM \`${parent.parentTable}\` WHERE \`${parent.parentTimestampCol}\` > ?)`
      queryParams.push(lastSyncTime)
    }
    // timestampCol이 없고 parentTable도 없으면 전체 UPSERT (categories 등)
  }

  const [rows] = await mysqlConn.query(query, queryParams) as [Record<string, unknown>[], unknown]

  if (!Array.isArray(rows) || rows.length === 0) {
    return { table: config.pgTable, synced: 0 }
  }

  // PK에서 따옴표 제거
  const cleanPk = config.pk.map(k => k.replace(/"/g, ''))

  // 배치 UPSERT (500건씩)
  const BATCH_SIZE = 500
  let totalSynced = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const mappedRows = batch.map(row => mapRow(row, config.columns))

    // Supabase upsert
    const { error } = await supabase
      .from(config.pgTable)
      .upsert(mappedRows, {
        onConflict: cleanPk.join(','),
        ignoreDuplicates: false,
      })

    if (error) {
      console.error(`[SYNC] ${config.pgTable} batch error:`, error.message)
      // 배치 실패 시 개별 upsert 시도
      for (const row of mappedRows) {
        const { error: singleError } = await supabase
          .from(config.pgTable)
          .upsert(row, { onConflict: cleanPk.join(','), ignoreDuplicates: false })
        if (!singleError) totalSynced++
      }
    } else {
      totalSynced += batch.length
    }
  }

  return { table: config.pgTable, synced: totalSynced }
}

export async function POST(request: NextRequest) {
  // 인증 확인
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 시스템 관리자 확인
  const { data: dbUser } = await supabaseAuth
    .from('users')
    .select('is_admin')
    .eq('auth_uid', user.id)
    .single()
  if (!dbUser?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const mode: 'full' | 'incremental' = body.mode || 'full'
  const lastSyncTime: string | null = body.lastSyncTime || null

  let mysqlConn: mysql.Connection | null = null

  try {
    // MySQL 연결
    mysqlConn = await getMysqlConnection()

    // Supabase admin 클라이언트 (RLS 우회)
    const supabase = createAdminClient()

    const results: { table: string; synced: number; error?: string }[] = []

    for (const config of TABLE_CONFIGS) {
      try {
        const result = await syncTable(mysqlConn, supabase, config, mode, lastSyncTime)
        results.push(result)
      } catch (err) {
        results.push({
          table: config.pgTable,
          synced: 0,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)

    return NextResponse.json({
      success: true,
      mode,
      syncTime: new Date().toISOString(),
      totalSynced,
      results,
    })

  } catch (err) {
    console.error('[SYNC] Error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Sync failed',
    }, { status: 500 })
  } finally {
    if (mysqlConn) await mysqlConn.end()
  }
}
