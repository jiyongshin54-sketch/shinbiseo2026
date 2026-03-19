import { CustomOrder } from '@/components/orders/custom-order'

export default function CustomOrderPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">맞춤품 주문</h2>
      <CustomOrder />
    </div>
  )
}
