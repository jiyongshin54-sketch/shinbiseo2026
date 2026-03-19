import { CustomerManagement } from '@/components/customers/customer-management'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">거래처 관리</h2>
      <CustomerManagement />
    </div>
  )
}
