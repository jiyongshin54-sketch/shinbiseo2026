'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReadyMadeOrder } from './ready-made-order'
import { CustomOrder } from './custom-order'
import { useCartStore } from '@/stores/cart-store'
import type { OrderMaster, OrderDetail, CartItem } from '@/lib/types'
import { toast } from 'sonner'

interface OrderEditModalProps {
  open: boolean
  onClose: () => void
  order: OrderMaster
  customerName?: string
  onEditComplete: () => void
}

export function OrderEditModal({ open, onClose, order, customerName, onEditComplete }: OrderEditModalProps) {
  const cart = useCartStore()
  const [loading, setLoading] = useState(true)

  // 주문 상세 로드 후 장바구니에 세팅
  useEffect(() => {
    if (!open) return

    const loadOrderDetails = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/orders/${order.order_id}/details?seller_id=${order.seller_id}`)
        const details: OrderDetail[] = await res.json()

        if (!Array.isArray(details)) {
          toast.error('주문 상세 조회 실패')
          return
        }

        const cartItems: CartItem[] = details.map(d => ({
          sequence: d.sequence,
          productId: '',
          categoryId: d.category_id || '',
          attribute01: d.attribute01 || '',
          attribute02: d.attribute02 || '',
          attribute03: d.attribute03 || '',
          attribute04: d.attribute04 || '',
          attribute05: d.attribute05 || '',
          attribute06: d.attribute06 || '',
          attribute07: d.attribute07 || '',
          attribute08: d.attribute08 || '',
          attribute09: d.attribute09 || '',
          attribute10: d.attribute10 || '',
          price: d.price,
          quantity: d.quantity,
          amount: d.amount,
          group: d.group || '',
        }))

        // 부가세율 역산: vat / (sum_amount + adjustment) 가 ~0.1이면 10%, 아니면 0%
        const adjustedAmount = order.sum_amount + order.adjustment
        const vatRate = adjustedAmount > 0 && order.vat > 0
          ? (Math.abs(order.vat / adjustedAmount - 0.1) < 0.02 ? 10 : 0)
          : 0

        cart.loadOrder({
          sellerId: order.seller_id,
          customerId: order.customer_id || '',
          customerName: customerName || order.customer_id || '',
          readyMade: (order.ready_made as '기성' | '맞춤') || '기성',
          orderDate: order.order_date || '',
          comment: order.comment || '',
          adjustment: order.adjustment || 0,
          vatRate: vatRate as 0 | 10,
          items: cartItems,
        })
      } catch {
        toast.error('주문 상세 조회 실패')
      } finally {
        setLoading(false)
      }
    }

    loadOrderDetails()
  }, [open, order.order_id, order.seller_id])

  const handleClose = () => {
    cart.clearCart()
    onClose()
  }

  const handleEditComplete = () => {
    onEditComplete()
    handleClose()
  }

  const isReadyMade = order.ready_made === '기성'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent
        className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: '1400px' }}
      >
        <DialogHeader>
          <DialogTitle>
            {isReadyMade ? '기성품 주문' : '맞춤품 주문'} — 수정 ({order.order_id})
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '14px' }}>
            주문 데이터를 불러오는 중...
          </div>
        ) : isReadyMade ? (
          <ReadyMadeOrder
            editMode
            editOrderId={order.order_id}
            editSellerId={order.seller_id}
            editCurrentStatus={order.status || '주문'}
            fixedCustomerId={order.customer_id || undefined}
            onEditComplete={handleEditComplete}
          />
        ) : (
          <CustomOrder
            fixedSellerId={order.seller_id}
            fixedCustomerId={order.customer_id || undefined}
            editMode
            editOrderId={order.order_id}
            editSellerId={order.seller_id}
            editCurrentStatus={order.status || '주문'}
            onEditComplete={handleEditComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
