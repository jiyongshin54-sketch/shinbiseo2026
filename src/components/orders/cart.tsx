'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CartProps {
  sellerId: string
  customerId?: string       // 판매회사가 선택한 고객
  buyerCompanyId?: string   // 구매회사 ID
  orderStatus: string
  onOrderStatusChange?: (status: string) => void
}

export function Cart({ sellerId, customerId, buyerCompanyId, orderStatus, onOrderStatusChange }: CartProps) {
  const { user, isSeller } = useAuth()
  const cart = useCartStore()
  const [submitting, setSubmitting] = useState(false)

  // 실제 customer_id 결정 (구매회사인 경우 contracts에서 가져와야 함)
  // 여기선 customerId prop 사용 (판매회사가 직접 선택한 경우)

  const handleSubmit = async () => {
    if (!sellerId) {
      toast.error('판매회사를 선택하세요.')
      return
    }
    if (isSeller && !customerId) {
      toast.error('거래처를 선택하세요.')
      return
    }
    if (cart.items.length === 0) {
      toast.error('장바구니가 비어있습니다.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          order_date: cart.orderDate,
          customer_id: customerId || '',
          ready_made: cart.readyMade,
          item_count: cart.items.length,
          sum_amount: cart.getSumAmount(),
          adjustment: cart.adjustmentSign === '-' ? -cart.adjustment : cart.adjustment,
          vat: cart.getVatAmount(),
          total_amount: cart.getTotalAmount(),
          payment_method: '',
          payment_date: '',
          comment: cart.comment,
          status: isSeller ? orderStatus : '주문',
          orderer_id: user?.userId,
          items: cart.items.map(item => ({
            category_id: item.categoryId,
            attribute01: item.attribute01,
            attribute02: item.attribute02,
            attribute03: item.attribute03,
            attribute04: item.attribute04,
            attribute05: item.attribute05,
            attribute06: item.attribute06,
            attribute07: item.attribute07,
            attribute08: item.attribute08,
            attribute09: item.attribute09,
            attribute10: item.attribute10,
            price: item.price,
            quantity: item.quantity,
            amount: item.amount,
            vat: 0,
            group: item.group,
          })),
        }),
      })

      const result = await res.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('주문이 등록되었습니다.')
        cart.clearCart()
      }
    } catch {
      toast.error('주문 등록 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            장바구니 ({cart.readyMade}) — {cart.items.length}건
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={cart.clearCart}>
            전체 삭제
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 장바구니 테이블 */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-center">#</th>
                <th className="p-2 text-left">품명</th>
                <th className="p-2 text-left">색깔</th>
                <th className="p-2 text-left">두께</th>
                <th className="p-2 text-left">사이즈</th>
                <th className="p-2 text-right">단가</th>
                <th className="p-2 text-right">수량</th>
                <th className="p-2 text-right">금액</th>
                <th className="p-2 text-center">묶음</th>
                <th className="p-2 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.sequence} className="border-b">
                  <td className="p-2 text-center text-xs">{item.sequence}</td>
                  <td className="p-2">{item.attribute01}</td>
                  <td className="p-2">{item.attribute02}</td>
                  <td className="p-2">{item.attribute03}</td>
                  <td className="p-2">{item.attribute04}</td>
                  <td className="p-2 text-right">{item.price.toLocaleString()}</td>
                  <td className="p-2 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="p-2 text-right font-medium">{item.amount.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <Input
                      className="h-7 w-16 text-center text-xs"
                      value={item.group}
                      onChange={(e) => cart.updateItem(item.sequence, { group: e.target.value })}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500"
                      onClick={() => cart.removeItem(item.sequence)}
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 영역 */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-t pt-4">
          <div className="flex items-end gap-3 flex-wrap">
            {/* 거래일자 */}
            <div className="space-y-1">
              <Label className="text-xs">거래일자</Label>
              <Input
                className="h-8 w-[130px]"
                value={cart.orderDate}
                onChange={(e) => cart.setOrderDate(e.target.value)}
              />
            </div>

            {/* 조정 */}
            <div className="space-y-1">
              <Label className="text-xs">합계 조정</Label>
              <div className="flex gap-1">
                <Select value={cart.adjustmentSign} onValueChange={(v) => v && cart.setAdjustmentSign(v as '+' | '-')}>
                  <SelectTrigger className="w-[60px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+">+</SelectItem>
                    <SelectItem value="-">-</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="h-8 w-[100px]"
                  value={cart.adjustment || ''}
                  onChange={(e) => cart.setAdjustment(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* 부가세 */}
            <div className="space-y-1">
              <Label className="text-xs">부가세</Label>
              <Select value={String(cart.vatRate)} onValueChange={(v) => v && cart.setVatRate(parseInt(v) as 0 | 10)}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 비고 */}
            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs">비고</Label>
              <Input
                className="h-8"
                value={cart.comment}
                onChange={(e) => cart.setComment(e.target.value)}
                placeholder="비고"
              />
            </div>

            {/* 상태 선택 (판매회사만) */}
            {isSeller && onOrderStatusChange && (
              <div className="space-y-1">
                <Label className="text-xs">상태</Label>
                <Select value={orderStatus} onValueChange={(v) => v && onOrderStatusChange(v)}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="주문">주문</SelectItem>
                    <SelectItem value="견적 요청">견적 요청</SelectItem>
                    <SelectItem value="견적 응답">견적 응답</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 합계 + 제출 */}
          <div className="text-right space-y-1">
            <div className="text-sm">
              공급가: <span className="font-medium">{cart.getSumAmount().toLocaleString()}</span>
            </div>
            {cart.adjustment > 0 && (
              <div className="text-sm">
                조정: <span>{cart.adjustmentSign}{cart.adjustment.toLocaleString()}</span>
              </div>
            )}
            <div className="text-sm">
              부가세: <span className="font-medium">{cart.getVatAmount().toLocaleString()}</span>
            </div>
            <div className="text-lg font-bold">
              합계: {cart.getTotalAmount().toLocaleString()}원
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2"
            >
              {submitting ? '등록 중...' : `${isSeller ? orderStatus : '주문'} 등록`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
