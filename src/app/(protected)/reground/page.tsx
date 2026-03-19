'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart-store'
import { Cart } from '@/components/orders/cart'
import { CustomOrder } from '@/components/orders/custom-order'
import { SELLER_COMPANIES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

const REGROUND_ID = SELLER_COMPANIES.REGROUND

interface ProductRow {
  seller_id: string
  product_id: string
  category_id: string | null
  attribute01: string | null  // 품명
  attribute02: string | null  // 구분 (color equivalent)
  attribute03: string | null  // 두께
  attribute04: string | null  // 사이즈
  attribute05: string | null  // (미사용)
  unit_price_level1: number
  unit_price_level2: number
  madae_criteria: number
  customer_level1: string
  customer_level2: string
  stock?: number
  categories?: { category_l: string | null; category_m: string | null; category_s: string | null }
}

interface CategoryOption {
  category_id: string
  category_m: string
  category_s: string
}

type TabType = 'ready-made' | 'custom' | 'price-list' | 'back'

export default function RegroundPage() {
  const { user, isSeller, isBuyer } = useAuth()
  const router = useRouter()
  const cart = useCartStore()

  const [tab, setTab] = useState<TabType>('ready-made')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [allProducts, setAllProducts] = useState<ProductRow[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState('주문')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selectedCategoryM, setSelectedCategoryM] = useState('')

  // 카테고리 로드
  useEffect(() => {
    fetch('/api/products?get_categories=true')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCategories(d) })
      .catch(() => {})
  }, [])

  // 판매회사(리그라운드) → 고객 목록 로드
  useEffect(() => {
    if (!user) return
    if (isSeller && user.companyId === REGROUND_ID) {
      fetch(`/api/customers?seller_id=${REGROUND_ID}`)
        .then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) })
    }
  }, [user, isSeller])

  const searchProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: REGROUND_ID })
      if (isBuyer && user?.companyId) params.set('buyer_company_id', user.companyId)
      if (isSeller && selectedCustomerId) {
        const cust = customers.find(c => c.customer_id === selectedCustomerId)
        if (cust?.company_id) params.set('buyer_company_id', cust.company_id)
      }
      if (searchKeyword) params.set('search', searchKeyword)
      if (selectedCategoryM) params.set('category_m', selectedCategoryM)
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch { toast.error('상품 조회 실패') }
    finally { setProductsLoading(false) }
  }, [isSeller, isBuyer, user, selectedCustomerId, customers, searchKeyword, selectedCategoryM])

  // 단가표용 전체 로드
  useEffect(() => {
    if (tab !== 'price-list') return
    const params = new URLSearchParams({ seller_id: REGROUND_ID })
    if (isBuyer && user?.companyId) params.set('buyer_company_id', user.companyId)
    fetch(`/api/products?${params}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllProducts(d) })
  }, [tab, isBuyer, user])

  const addToCart = (p: ProductRow) => {
    const qtyStr = quantities[p.product_id]
    if (!qtyStr || parseInt(qtyStr) === 0) { toast.error('수량을 입력하세요.'); return }
    const inputQty = parseInt(qtyStr)
    const quantity = inputQty * 100
    const absQty = Math.abs(quantity)
    const unitPrice = absQty < p.madae_criteria ? p.unit_price_level1 : p.unit_price_level2
    const amount = quantity * unitPrice

    if (!cart.sellerId) cart.setSeller(REGROUND_ID)
    cart.setReadyMade('기성')
    if (isSeller) cart.setCustomerId(selectedCustomerId)
    cart.addItem({
      productId: p.product_id, categoryId: p.category_id || '',
      attribute01: p.attribute01 || '', attribute02: p.attribute02 || '',
      attribute03: p.attribute03 || '', attribute04: p.attribute04 || '',
      attribute05: p.attribute05 || '', attribute06: '', attribute07: '',
      attribute08: '', attribute09: '', attribute10: p.categories?.category_s || '',
      price: unitPrice, quantity, amount, group: '',
    })
    setQuantities(prev => ({ ...prev, [p.product_id]: '' }))
    toast.success(`${p.attribute01} 추가됨`)
  }

  const uniqueCategoryMs = [...new Set(categories.map(c => c.category_m).filter(Boolean))]

  if (!user) return null

  return (
    <div>
      {/* 헤더: 리그라운드/오픈패키지 로고 */}
      <div style={{ backgroundColor: '#2e7d32', color: 'white', padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>오픈패키지 (Re-ground)</span>
          <span style={{ fontSize: '12px', color: '#ccc' }}>02-2267-0100</span>
        </div>
        <span style={{ fontSize: '12px' }}>{user.userName}님 환영합니다</span>
      </div>

      {/* 탭 메뉴 */}
      <div style={{ display: 'flex', backgroundColor: '#388e3c', borderBottom: '2px solid #1b5e20' }}>
        {([
          { key: 'ready-made' as TabType, label: '기성품 주문' },
          { key: 'custom' as TabType, label: '맞춤품 주문' },
          { key: 'price-list' as TabType, label: '기성품 단가표' },
          { key: 'back' as TabType, label: '신BS로 돌아가기' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => t.key === 'back' ? router.push('/main') : setTab(t.key)}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
              color: tab === t.key ? '#2e7d32' : 'white',
              backgroundColor: tab === t.key ? 'white' : 'transparent',
              border: 'none', borderBottom: tab === t.key ? '2px solid white' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 거래처 선택 바 */}
      {(tab === 'ready-made' || tab === 'custom') && (
        <div style={{ backgroundColor: 'silver', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>거래처:</span>
          {isSeller ? (
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              style={{ padding: '2px', fontSize: '14px' }}
            >
              <option value="">선택</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name}({c.owner_name})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '14px' }}>{user.companyName}</span>
          )}
        </div>
      )}

      {/* === 기성품 주문 탭 === */}
      {tab === 'ready-made' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '5px' }}>
              {/* 카테고리 필터 + 검색 */}
              <div style={{ display: 'flex', gap: '3px', marginBottom: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                <select
                  value={selectedCategoryM}
                  onChange={e => setSelectedCategoryM(e.target.value)}
                  style={{ padding: '2px 4px', fontSize: '13px' }}
                >
                  <option value="">전체 카테고리</option>
                  {uniqueCategoryMs.map(cm => (
                    <option key={cm} value={cm}>{cm}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchProducts()}
                  placeholder="품명/사이즈 검색"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '14px', backgroundColor: 'yellow', border: '1px solid #999' }}
                />
                <button onClick={searchProducts} disabled={productsLoading} style={{ padding: '4px 12px', fontSize: '13px' }}>조회</button>
              </div>

              <div style={{ maxHeight: '612px', overflowY: 'auto', border: '1px solid silver' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#c8e6c9' }}>
                      <th style={thStyle}>대분류</th>
                      <th style={thStyle}>소분류</th>
                      <th style={thStyle}>품명</th>
                      <th style={thStyle}>구분</th>
                      <th style={thStyle}>두께</th>
                      <th style={thStyle}>사이즈</th>
                      <th style={thStyle}>일반가</th>
                      <th style={thStyle}>마대가</th>
                      <th style={thStyle}>재고</th>
                      <th style={{ ...thStyle, width: '70px' }}>수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center' }}>조회 중...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center' }}>품명 또는 사이즈를 입력 후 조회하세요</td></tr>
                    ) : products.map(p => (
                      <tr key={p.product_id} className="hover:bg-gray-100" style={{ cursor: 'pointer' }}>
                        <td style={tdStyle}>{p.categories?.category_m || ''}</td>
                        <td style={tdStyle}>{p.categories?.category_s || ''}</td>
                        <td style={tdStyle}>{p.attribute01}</td>
                        <td style={tdStyle}>{p.attribute02}</td>
                        <td style={tdStyle}>{p.attribute03}</td>
                        <td style={tdStyle}>{p.attribute04}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level1}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level2}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: (p.stock || 0) > 0 ? 'blue' : '#999' }}>
                          {p.stock || 0}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={quantities[p.product_id] || ''}
                              onChange={e => setQuantities(prev => ({ ...prev, [p.product_id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addToCart(p)}
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
            <td style={{ verticalAlign: 'top', paddingLeft: '5px' }}>
              <Cart
                sellerId={REGROUND_ID}
                customerId={isSeller ? selectedCustomerId : undefined}
                buyerCompanyId={isBuyer ? user.companyId : undefined}
                orderStatus={orderStatus}
                onOrderStatusChange={isSeller ? v => setOrderStatus(v) : undefined}
              />
            </td>
          </tr></tbody>
        </table>
      )}

      {/* === 맞춤품 주문 탭 === */}
      {tab === 'custom' && (
        <CustomOrder
          fixedSellerId={REGROUND_ID}
          fixedCustomerId={isSeller ? selectedCustomerId : undefined}
        />
      )}

      {/* === 기성품 단가표 탭 === */}
      {tab === 'price-list' && (
        <div style={{ maxHeight: '700px', overflowY: 'auto', border: '1px solid silver', marginTop: '5px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#c8e6c9', position: 'sticky', top: 0 }}>
                <th style={thStyle}>No</th>
                <th style={thStyle}>대분류</th>
                <th style={thStyle}>소분류</th>
                <th style={thStyle}>품명</th>
                <th style={thStyle}>구분</th>
                <th style={thStyle}>두께</th>
                <th style={thStyle}>사이즈</th>
                <th style={thStyle}>일반가</th>
                <th style={thStyle}>마대가</th>
                <th style={thStyle}>재고</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</td></tr>
              ) : allProducts.map((p, i) => (
                <tr key={p.product_id} className="hover:bg-gray-100">
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                  <td style={tdStyle}>{p.categories?.category_m || ''}</td>
                  <td style={tdStyle}>{p.categories?.category_s || ''}</td>
                  <td style={tdStyle}>{p.attribute01}</td>
                  <td style={tdStyle}>{p.attribute02}</td>
                  <td style={tdStyle}>{p.attribute03}</td>
                  <td style={tdStyle}>{p.attribute04}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level1}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{p.unit_price_level2}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: (p.stock || 0) > 0 ? 'blue' : '#999' }}>{p.stock || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
