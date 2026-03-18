'use client'

import { useEffect, useState } from 'react'
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
import { Cart } from './cart'
import { calculateCustomPrice, gradeToNumber } from '@/lib/pricing'
import { COLOR_COUNT_OPTIONS, SELLER_COMPANIES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

interface SellerOption {
  seller_id: string
  seller_alias: string
  customer_id: string
}

export function CustomOrder() {
  const { user, isSeller, isBuyer } = useAuth()
  const cart = useCartStore()

  // 거래 대상
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState('')

  // 맞춤품 입력
  const [productName, setProductName] = useState('')
  const [color, setColor] = useState('')
  const [thickness, setThickness] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [colorCountIdx, setColorCountIdx] = useState('0')
  const [printName, setPrintName] = useState('')
  const [processMethod, setProcessMethod] = useState('')
  const [designFileName, setDesignFileName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [quantity, setQuantity] = useState('')

  // 주문 상태 (판매회사용)
  const [orderStatus, setOrderStatus] = useState('견적 요청')

  // 판매회사 → 고객 목록
  useEffect(() => {
    if (!user || !isSeller) return
    fetch(`/api/customers?seller_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCustomers(data) })
  }, [user, isSeller])

  // 구매회사 → 계약된 판매회사 목록
  useEffect(() => {
    if (!user || !isBuyer) return
    fetch(`/api/contracts?buyer_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSellers(data)
          const pungwon = data.find((s: SellerOption) => s.seller_id === SELLER_COMPANIES.PUNGWON)
          if (pungwon) setSelectedSellerId(pungwon.seller_id)
          else if (data.length > 0) setSelectedSellerId(data[0].seller_id)
        }
      })
      .catch(() => {})
  }, [user, isBuyer])

  // 등급상수 결정
  const getGradeConstant = (): number => {
    if (isSeller) {
      // 판매회사: 선택한 고객의 Level2 사용
      const customer = customers.find(c => c.customer_id === selectedCustomerId)
      return gradeToNumber(customer?.level2 || '4.0급')
    } else {
      // 구매회사: 본인의 Level1 사용 (API에서 가져와야 하지만, 기본값 사용)
      return 4.0
    }
  }

  // 단가 자동 계산
  const handleCalculatePrice = () => {
    const t = parseFloat(thickness)
    const w = parseFloat(width)
    const l = parseFloat(length)

    if (isNaN(t) || isNaN(w) || isNaN(l)) {
      toast.error('두께, 폭, 길이를 입력하세요.')
      return
    }

    const colorCount = COLOR_COUNT_OPTIONS[parseInt(colorCountIdx)]?.value || 0
    const gradeConstant = getGradeConstant()

    const price = calculateCustomPrice({
      thickness: t,
      width: w,
      length: l,
      colorCount,
      gradeConstant,
    })

    setUnitPrice(String(price))
    toast.success(`계산된 단가: ${price.toLocaleString()}원`)
  }

  // 장바구니 추가
  const handleAddToCart = () => {
    const price = parseFloat(unitPrice)
    const qty = parseInt(quantity)

    if (!productName) {
      toast.error('품명을 입력하세요.')
      return
    }
    if (isNaN(price) || price <= 0) {
      toast.error('단가를 계산 또는 입력하세요.')
      return
    }
    if (isNaN(qty) || qty <= 0) {
      toast.error('수량을 입력하세요.')
      return
    }

    const amount = price * qty
    const activeSellerId = isSeller ? user!.companyId : selectedSellerId

    if (!cart.sellerId) {
      cart.setSeller(activeSellerId)
    }
    cart.setReadyMade('맞춤')

    const colorLabel = COLOR_COUNT_OPTIONS[parseInt(colorCountIdx)]?.label || ''

    cart.addItem({
      productId: '',
      categoryId: '',
      attribute01: productName,
      attribute02: color,
      attribute03: thickness,
      attribute04: `${width}*${length}`,
      attribute05: printName,       // 인쇄명
      attribute06: colorLabel,      // 도수
      attribute07: processMethod,   // 가공방식
      attribute08: designFileName,  // 도안명
      attribute09: '',
      attribute10: '',
      price,
      quantity: qty,
      amount,
      group: '',
    })

    toast.success(`${productName} 추가됨`)

    // 폼 리셋 (품명/색깔은 유지, 나머지 초기화)
    setThickness('')
    setWidth('')
    setLength('')
    setUnitPrice('')
    setQuantity('')
  }

  if (!user) return null

  const activeSellerId = isSeller ? user.companyId : selectedSellerId

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">맞춤품 주문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 거래 대상 선택 */}
          <div className="flex items-end gap-3 flex-wrap">
            {isSeller && (
              <div className="space-y-1">
                <Label className="text-xs">거래처</Label>
                <Select value={selectedCustomerId} onValueChange={(v) => v && setSelectedCustomerId(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="거래처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.customer_id} value={c.customer_id}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isBuyer && (
              <div className="space-y-1">
                <Label className="text-xs">판매회사</Label>
                <Select value={selectedSellerId} onValueChange={(v) => v && setSelectedSellerId(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="판매회사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(s => (
                      <SelectItem key={s.seller_id} value={s.seller_id}>
                        {s.seller_alias || s.seller_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 맞춤품 입력 폼 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">품명 *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="품명" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">색깔</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="색깔" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">두께 (mm) *</Label>
              <Input type="number" step="0.001" value={thickness} onChange={(e) => setThickness(e.target.value)} placeholder="0.03" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">폭 (mm) *</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="250" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">길이 (mm) *</Label>
              <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} placeholder="350" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">도수 (인쇄)</Label>
              <Select value={colorCountIdx} onValueChange={(v) => v && setColorCountIdx(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_COUNT_OPTIONS.map((opt, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">인쇄명</Label>
              <Input value={printName} onChange={(e) => setPrintName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">가공방식</Label>
              <Input value={processMethod} onChange={(e) => setProcessMethod(e.target.value)} />
            </div>
          </div>

          {/* 단가 계산 + 수량 */}
          <div className="flex items-end gap-3 flex-wrap border-t pt-3">
            <Button variant="outline" onClick={handleCalculatePrice}>
              단가 계산
            </Button>
            <div className="space-y-1">
              <Label className="text-xs">단가 (수정 가능)</Label>
              <Input
                type="number"
                step="0.1"
                className="w-[120px]"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="자동 계산"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">수량 *</Label>
              <Input
                type="number"
                className="w-[100px]"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            {unitPrice && quantity && (
              <div className="text-sm font-medium">
                금액: {(parseFloat(unitPrice || '0') * parseInt(quantity || '0')).toLocaleString()}원
              </div>
            )}
            <Button onClick={handleAddToCart}>
              장바구니 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 장바구니 (맞춤품) */}
      {cart.items.length > 0 && cart.readyMade === '맞춤' && (
        <Cart
          sellerId={activeSellerId || ''}
          customerId={isSeller ? selectedCustomerId : undefined}
          buyerCompanyId={isBuyer ? user.companyId : undefined}
          orderStatus={orderStatus}
          onOrderStatusChange={isSeller ? (v) => setOrderStatus(v) : undefined}
        />
      )}
    </div>
  )
}
