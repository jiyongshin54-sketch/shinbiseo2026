import { ReadyMadeOrder } from '@/components/orders/ready-made-order'

export default function ReadyMadeOrderPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">기성품 주문</h2>
      <ReadyMadeOrder />
    </div>
  )
}
