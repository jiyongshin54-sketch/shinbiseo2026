'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Cart } from './cart'
import { SELLER_COMPANIES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

interface ProductWithPrice {
  seller_id: string
  product_id: string
  category_id: string | null
  attribute01: string | null // 품명
  attribute02: string | null // 색깔
  attribute03: string | null // 두께
  attribute04: string | null // 사이즈
  attribute05: string | null // 마대수량
  unit_price_level1: number
  unit_price_level2: number
  madae_criteria: number
  customer_level1: string
  customer_level2: string
  categories?: { category_l: string | null; category_m: string | null; category_s: string | null }
}

interface SellerOption {
  seller_id: string
  seller_alias: string
  customer_id: string
}

export function ReadyMadeOrder() {
  const { user, isSeller, isBuyer } = useAuth()
  const cart = useCartStore()

  // 거래 대상 선택
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState('')

  // 상품 검색
  const [searchKeyword, setSearchKeyword] = useState('')
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // 수량 입력 (제품별)
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  // 주문 상태 (판매회사용)
  const [orderStatus, setOrderStatus] = useState('주문')

  // 판매회사 → 고객 목록 로드
  useEffect(() => {
    if (!user || !isSeller) return
    fetch(`/api/customers?seller_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCustomers(data)
      })
  }, [user, isSeller])

  // 구매회사 → 계약된 판매회사 목록 로드
  useEffect(() => {
    if (!user || !isBuyer) return
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    // contracts에서 buyer_id = 내 회사인 판매회사 목록
    fetch(`/api/contracts?buyer_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSellers(data)
          // 기본값: 풍원
          const pungwon = data.find((s: SellerOption) => s.seller_id === SELLER_COMPANIES.PUNGWON)
          if (pungwon) setSelectedSellerId(pungwon.seller_id)
          else if (data.length > 0) setSelectedSellerId(data[0].seller_id)
        }
      })
      .catch(() => {})
  }, [user, isBuyer])

  const activeSellerId = isSeller ? user?.companyId : selectedSellerId
  const activeCustomerId = isSeller ? selectedCustomerId : undefined
  const activeBuyerCompanyId = isBuyer ? user?.companyId : undefined

  // 상품 검색
  const searchProducts = useCallback(async () => {
    if (!activeSellerId) return
    setProductsLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: activeSellerId })
      if (activeBuyerCompanyId) params.set('buyer_company_id', activeBuyerCompanyId)
      if (activeCustomerId) {
        // 판매회사: 선택한 고객의 company_id로 가격 조회
        const customer = customers.find(c => c.customer_id === activeCustomerId)
        if (customer?.company_id) params.set('buyer_company_id', customer.company_id)
      }
      if (searchKeyword) params.set('search', searchKeyword)

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch {
      toast.error('상품 조회 실패')
    } finally {
      setProductsLoading(false)
    }
  }, [activeSellerId, activeBuyerCompanyId, activeCustomerId, searchKeyword, customers])

  // 장바구니에 추가
  const addToCart = (product: ProductWithPrice) => {
    const qtyStr = quantities[product.product_id]
    if (!qtyStr || parseInt(qtyStr) === 0) {
      toast.error('수량을 입력하세요.')
      return
    }

    const inputQty = parseInt(qtyStr)
    const quantity = inputQty * 100 // 내부 ×100 처리
    const absQuantity = Math.abs(quantity)

    // 마대기준에 따라 가격 선택
    const unitPrice = absQuantity < product.madae_criteria
      ? product.unit_price_level1  // 일반가
      : product.unit_price_level2  // 마대가 (대량 할인)

    const amount = quantity * unitPrice

    // 판매회사일 때 sellerId / customerId 세팅
    if (isSeller && !cart.sellerId) {
      cart.setSeller(user!.companyId)
    }
    if (isBuyer && !cart.sellerId) {
      cart.setSeller(activeSellerId!)
    }

    cart.setReadyMade('기성')

    cart.addItem({
      productId: product.product_id,
      categoryId: product.category_id || '',
      attribute01: product.attribute01 || '',
      attribute02: product.attribute02 || '',
      attribute03: product.attribute03 || '',
      attribute04: product.attribute04 || '',
      attribute05: product.attribute05 || '',
      attribute06: '',
      attribute07: '',
      attribute08: '',
      attribute09: '',
      attribute10: product.categories?.category_s || '',
      price: unitPrice,
      quantity,
      amount,
      group: '',
    })

    // 수량 초기화
    setQuantities(prev => ({ ...prev, [product.product_id]: '' }))
    toast.success(`${product.attribute01} 추가됨`)
  }

  if (!user) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기성품 주문</CardTitle>
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

            {/* 검색 */}
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">상품 검색</Label>
              <div className="flex gap-2">
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="사이즈, 품명, 색깔"
                  onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                />
                <Button onClick={searchProducts} disabled={productsLoading}>
                  {productsLoading ? '...' : '조회'}
                </Button>
              </div>
            </div>
          </div>

          {/* 상품 목록 */}
          {products.length > 0 && (
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left">품명</th>
                    <th className="p-2 text-left">색깔</th>
                    <th className="p-2 text-left">두께</th>
                    <th className="p-2 text-left">사이즈</th>
                    <th className="p-2 text-right">마대기준</th>
                    <th className="p-2 text-right">일반가</th>
                    <th className="p-2 text-right">마대가</th>
                    <th className="p-2 text-center w-[120px]">수량</th>
                    <th className="p-2 text-center w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.product_id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{p.attribute01}</td>
                      <td className="p-2">{p.attribute02}</td>
                      <td className="p-2">{p.attribute03}</td>
                      <td className="p-2">{p.attribute04}</td>
                      <td className="p-2 text-right">{p.madae_criteria || '-'}</td>
                      <td className="p-2 text-right">
                        <Badge variant="outline" className="text-xs">
                          {p.unit_price_level1.toLocaleString()}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="secondary" className="text-xs">
                          {p.unit_price_level2.toLocaleString()}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          className="h-8 text-right"
                          value={quantities[p.product_id] || ''}
                          onChange={(e) => setQuantities(prev => ({
                            ...prev,
                            [p.product_id]: e.target.value,
                          }))}
                          onKeyDown={(e) => e.key === 'Enter' && addToCart(p)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button size="sm" className="h-8 text-xs" onClick={() => addToCart(p)}>
                          담기
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 장바구니 */}
      {cart.items.length > 0 && (
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
