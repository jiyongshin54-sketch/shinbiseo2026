import { createClient } from '@/lib/supabase/server'
import { DisplayBoard } from '@/components/orders/display-board'
import { ReadyMadeOrder } from '@/components/orders/ready-made-order'
import { CustomOrder } from '@/components/orders/custom-order'
import { CustomerManagement } from '@/components/customers/customer-management'

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dbUser } = await supabase
    .from('users')
    .select(`
      user_id, user_name, power, company_id,
      companies ( company_name, company_alias, power )
    `)
    .eq('auth_uid', user!.id)
    .single()

  const company = Array.isArray(dbUser?.companies)
    ? dbUser?.companies[0]
    : dbUser?.companies

  const isSeller = company?.power === '판매'

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {isSeller ? '오늘의 거래' : '주문 현황'}
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{company?.company_name}</span>
          <span>|</span>
          <span>{dbUser?.user_name} ({dbUser?.power})</span>
        </div>
      </div>

      {/* 전광판 */}
      <DisplayBoard />

      {/* 기성품 주문 */}
      <ReadyMadeOrder />

      {/* 맞춤품 주문 */}
      <CustomOrder />

      {/* 고객관리 */}
      <CustomerManagement />
    </div>
  )
}
