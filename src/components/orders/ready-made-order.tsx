'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart-store'
import { Cart } from './cart'
import { SELLER_COMPANIES, PRICE_GRADES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { CustomerSearchSelect } from '@/components/ui/customer-search-select'
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

  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState('주문')

  // 판매회사 → 고객 목록 로드
  useEffect(() => {
    if (!user || !isSeller) return
    fetch(`/api/customers?seller_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCustomers(data) })
  }, [user, isSeller])

  // 구매회사 → 계약된 판매회사 목록 로드
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

  const activeSellerId = isSeller ? user?.companyId : selectedSellerId
  const activeCustomerId = isSeller ? selectedCustomerId : undefined
  const activeBuyerCompanyId = isBuyer ? user?.companyId : undefined

  const searchProducts = useCallback(async () => {
    if (!activeSellerId) return
    setProductsLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: activeSellerId })
      if (activeBuyerCompanyId) params.set('buyer_company_id', activeBuyerCompanyId)
      if (activeCustomerId) {
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

  const validGrades = PRICE_GRADES as readonly string[]

  const addToCart = (product: ProductWithPrice) => {
    // 등급 유효성 검증 (Level이 null이거나 범위 밖이면 차단)
    const level1 = product.customer_level1
    const level2 = product.customer_level2
    if (!level1 || !level2 || !validGrades.includes(level1) || !validGrades.includes(level2)) {
      toast.error('고객 단가 산정 중 오류!! 풍원에 문의하세요!!')
      return
    }

    const qtyStr = quantities[product.product_id]
    if (!qtyStr || parseInt(qtyStr) === 0) { toast.error('수량을 입력하세요.'); return }
    const inputQty = parseInt(qtyStr)
    const quantity = inputQty * 100
    const absQuantity = Math.abs(quantity)
    const unitPrice = absQuantity < product.madae_criteria
      ? product.unit_price_level1 : product.unit_price_level2
    const amount = quantity * unitPrice

    if (isSeller && !cart.sellerId) cart.setSeller(user!.companyId)
    if (isBuyer && !cart.sellerId) cart.setSeller(activeSellerId!)
    cart.setReadyMade('기성')
    cart.addItem({
      productId: product.product_id, categoryId: product.category_id || '',
      attribute01: product.attribute01 || '', attribute02: product.attribute02 || '',
      attribute03: product.attribute03 || '', attribute04: product.attribute04 || '',
      attribute05: product.attribute05 || '', attribute06: '', attribute07: '',
      attribute08: '', attribute09: '', attribute10: product.categories?.category_s || '',
      price: unitPrice, quantity, amount, group: '',
    })
    setQuantities(prev => ({ ...prev, [product.product_id]: '' }))
    toast.success(`${product.attribute01} 추가됨`)
  }

  if (!user) return null

  return (
    <div>
      {/* 상단: 구분 + 거래처 선택 바 (구 앱 silver 배경) */}
      <div style={{ backgroundColor: 'silver', padding: '5px 8px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>구분:</span>
          <select
            defaultValue={isSeller ? '판매' : '구매'}
            disabled={isBuyer}
            style={{ padding: '2px', fontSize: '14px' }}
          >
            <option value="판매">판매</option>
            <option value="구매">구매</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>거래처:</span>
          {isSeller ? (
              <CustomerSearchSelect
                customers={customers}
                value={selectedCustomerId}
                onChange={(id) => setSelectedCustomerId(id)}
                width="200px"
              />
          ) : (
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              style={{ padding: '2px', fontSize: '14px' }}
            >
              {sellers.map(s => (
                <option key={s.seller_id} value={s.seller_id}>
                  {s.seller_alias || s.seller_id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 좌48% + 우 장바구니 (구 앱 2단 레이아웃) */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* 좌측: 상품 검색 + 후보 목록 */}
            <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '5px' }}>
              {/* 검색 입력 - 구 앱 yellow 배경 */}
              <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                  placeholder="사이즈(예, 15*20)를 입력 하시고 엔터키를 누르세요!!"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: 'yellow',
                    border: '1px solid #999',
                  }}
                />
                <button
                  onClick={searchProducts}
                  disabled={productsLoading}
                  style={{ padding: '4px 12px', fontSize: '13px', cursor: 'pointer' }}
                >
                  조회
                </button>
              </div>

              {/* 상품 후보 GridView */}
              <div style={{ maxHeight: '612px', overflowY: 'auto', border: '1px solid silver' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ccffcc' }}>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>품명</th>
                      <th style={thStyle}>색깔</th>
                      <th style={thStyle}>두께</th>
                      <th style={thStyle}>사이즈</th>
                      <th style={thStyle}>마대수량</th>
                      <th style={thStyle}>일반가</th>
                      <th style={thStyle}>마대가</th>
                      <th style={{ ...thStyle, width: '70px' }}>수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center' }}>조회 중...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center' }}>사이즈를 입력 후 조회하세요</td></tr>
                    ) : products.map((p) => (
                      <tr key={p.product_id} className="hover:bg-gray-100" style={{ cursor: 'pointer' }}>
                        <td style={tdStyle}>{p.categories?.category_m || ''}</td>
                        <td style={tdStyle}>{p.attribute01}</td>
                        <td style={tdStyle}>{p.attribute02}</td>
                        <td style={tdStyle}>{p.attribute03}</td>
                        <td style={tdStyle}>{p.attribute04}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.madae_criteria?.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level1}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level2}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={quantities[p.product_id] || ''}
                              onChange={(e) => setQuantities(prev => ({ ...prev, [p.product_id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addToCart(p)}
                              style={{ width: '40px', textAlign: 'right', padding: '1px', fontSize: '12px', backgroundColor: 'whitesmoke', border: 'none' }}
                            />
                            <span style={{ fontSize: '11px', color: '#666' }}>00</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>

            {/* 우측: 장바구니 */}
            <td style={{ verticalAlign: 'top', paddingLeft: '5px' }}>
              <Cart
                sellerId={activeSellerId || ''}
                customerId={isSeller ? selectedCustomerId : undefined}
                buyerCompanyId={isBuyer ? user.companyId : undefined}
                orderStatus={orderStatus}
                onOrderStatusChange={isSeller ? (v) => setOrderStatus(v) : undefined}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 안내문 - 구 앱 orange 배경 */}
      <div style={{ backgroundColor: 'orange', padding: '10px', marginTop: '10px', fontSize: '13px' }}>
        <strong>기성품 주문 방법 안내</strong><br />
        <span style={{ color: 'blue' }}>* 기성품 상품 추가는 키보드의 숫자키와 엔터키만으로도 처리가 가능합니다 *</span><br />
        1. 노란색 칸에 size를(예, 15*20) 입력 하고 엔터<br />
        2. 탭키로 상품 선택 후 수량을 100장 단위로 입력하고 엔터<br />
        3. 엔터를 치면 자동으로 장바구니에 추가됩니다
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '3px 5px', border: '1px solid silver', textAlign: 'left',
  whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '12px',
}
const tdStyle: React.CSSProperties = {
  padding: '3px 5px', border: '1px solid silver', whiteSpace: 'nowrap', fontSize: '12px',
}
