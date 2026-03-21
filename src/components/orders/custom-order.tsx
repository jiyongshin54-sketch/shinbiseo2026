'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart-store'
import { CustomerSearchSelect } from '@/components/ui/customer-search-select'
import { Cart } from './cart'
import { calculateCustomPrice, gradeToNumber } from '@/lib/pricing'
import { COLOR_COUNT_OPTIONS, SELLER_COMPANIES, PRICE_GRADES } from '@/lib/constants'
import type { Customer } from '@/lib/types'
import { toast } from 'sonner'

interface SellerOption {
  seller_id: string
  seller_alias: string
  customer_id: string
}

interface Category {
  category_id: string
  category_m: string | null
  category_s: string | null
}

interface CustomOrderProps {
  fixedSellerId?: string
  fixedCustomerId?: string
}

export function CustomOrder({ fixedSellerId, fixedCustomerId }: CustomOrderProps = {}) {
  const { user, isSeller, isBuyer } = useAuth()
  const cart = useCartStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 거래 대상
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState('')
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale')

  // 카테고리
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')

  // 맞춤품 입력
  const [productName, setProductName] = useState('')
  const [color, setColor] = useState('')
  const [thickness, setThickness] = useState('')
  const [size, setSize] = useState('')
  const [colorCountIdx, setColorCountIdx] = useState('0')
  const [printName, setPrintName] = useState('')
  const [processMethod, setProcessMethod] = useState('')
  const [designFile, setDesignFile] = useState<File | null>(null)
  const [unitPrice, setUnitPrice] = useState('')
  const [quantity, setQuantity] = useState('1')

  // 구매회사: 판매회사 고객으로 등록된 내 Level2
  const [buyerLevel2, setBuyerLevel2] = useState<string>('')

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

  // 카테고리 로드
  useEffect(() => {
    fetch('/api/products?get_categories=true')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
  }, [])

  // 구매회사: 선택한 판매회사의 customers에서 내 Level2 조회
  useEffect(() => {
    if (!user || !isBuyer || !selectedSellerId) return
    fetch(`/api/customers?seller_id=${selectedSellerId}&search=${encodeURIComponent(user.companyId)}&by_company_id=true`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBuyerLevel2(data[0].level2 || '')
        } else {
          setBuyerLevel2('')
        }
      })
      .catch(() => setBuyerLevel2(''))
  }, [user, isBuyer, selectedSellerId])

  const validGrades = PRICE_GRADES as readonly string[]

  const getGradeConstant = (): number | null => {
    let level2: string | undefined | null
    if (isSeller) {
      const customer = customers.find(c => c.customer_id === activeCustomerId)
      level2 = customer?.level2
    } else {
      level2 = buyerLevel2
    }
    if (!level2 || !validGrades.includes(level2)) return null
    return gradeToNumber(level2)
  }

  // 단가 자동 계산
  const handleCalculatePrice = () => {
    const t = parseFloat(thickness)
    // size에서 폭*길이 파싱
    const sizeParts = size.split('*').map(s => parseFloat(s.trim()))
    if (isNaN(t) || sizeParts.length < 2 || isNaN(sizeParts[0]) || isNaN(sizeParts[1])) {
      toast.error('두께, 사이즈(폭*길이)를 입력하세요.')
      return
    }

    const gradeConstant = getGradeConstant()
    if (gradeConstant === null) {
      toast.error('고객 단가 산정 중 오류!! 풍원에 문의하세요!!')
      return
    }

    const colorCount = COLOR_COUNT_OPTIONS[parseInt(colorCountIdx)]?.value || 0
    const price = calculateCustomPrice({
      thickness: t,
      width: sizeParts[0],
      length: sizeParts[1],
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

    if (!productName) { toast.error('상품명을 입력하세요.'); return }
    if (isNaN(price) || price <= 0) { toast.error('단가를 계산 또는 입력하세요.'); return }
    if (isNaN(qty) || qty <= 0) { toast.error('수량을 입력하세요.'); return }

    const amount = price * qty
    const sellerForCart = fixedSellerId || (isSeller ? user!.companyId : selectedSellerId)

    if (!cart.sellerId) cart.setSeller(sellerForCart)
    cart.setReadyMade('맞춤')

    const colorLabel = COLOR_COUNT_OPTIONS[parseInt(colorCountIdx)]?.label || ''

    cart.addItem({
      productId: '', categoryId: selectedCategory,
      attribute01: productName, attribute02: color,
      attribute03: thickness, attribute04: size,
      attribute05: printName, attribute06: colorLabel,
      attribute07: processMethod, attribute08: designFile?.name || '',
      attribute09: '', attribute10: '',
      price, quantity: qty, amount, group: '',
    })

    toast.success(`${productName} 추가됨`)
    setThickness(''); setSize(''); setUnitPrice(''); setQuantity('1')
    setDesignFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!user) return null

  const activeSellerId = fixedSellerId || (isSeller ? user.companyId : selectedSellerId)
  const activeCustomerId = fixedCustomerId || selectedCustomerId

  const estimatedAmount = (parseFloat(unitPrice || '0') * parseInt(quantity || '0')) || 0

  // 카테고리 표시명
  const categoryOptions = categories.reduce((acc, c) => {
    const name = [c.category_m, c.category_s].filter(Boolean).join(' > ') || c.category_id
    if (!acc.find(a => a.name === name)) acc.push({ id: c.category_id, name })
    return acc
  }, [] as { id: string; name: string }[])

  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', minWidth: '70px' }
  const inputStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '13px', border: '1px solid #ccc', width: '100%' }
  const selectStyle: React.CSSProperties = { ...inputStyle }

  return (
    <div>
      {/* 구분 + 거래처 바 */}
      <div style={{ backgroundColor: '#e8eef4', padding: '6px 10px', marginBottom: '2px', border: '1px solid #c0c8d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          {!fixedSellerId && (
            <>
              <span style={labelStyle}>구분:</span>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input type="radio" name="orderType" checked={orderType === 'sale'} onChange={() => setOrderType('sale')} /> 판매
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input type="radio" name="orderType" checked={orderType === 'purchase'} onChange={() => setOrderType('purchase')} /> 구매
              </label>
            </>
          )}

          <span style={labelStyle}>고객사:</span>
          {isSeller ? (
            <CustomerSearchSelect
              customers={customers}
              value={fixedCustomerId || selectedCustomerId}
              onChange={(id) => setSelectedCustomerId(id)}
              width="250px"
            />
          ) : (
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              style={{ ...selectStyle, width: '250px' }}
            >
              <option value="">판매회사 선택</option>
              {sellers.map(s => (
                <option key={s.seller_id} value={s.seller_id}>{s.seller_alias || s.seller_id}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 좌우 분할: 주문입력 / 장바구니 */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* 왼쪽: 맞춤품 주문 입력 */}
            <td style={{ width: '60%', verticalAlign: 'top', paddingRight: '8px' }}>
              <div style={{ border: '1px solid #ddd', marginTop: '5px' }}>
                <div style={{ backgroundColor: '#f5f5f5', padding: '6px 10px', borderBottom: '1px solid #ddd' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>맞춤품 주문 입력</span>
                </div>

                {/* 거래처 미선택 안내 */}
                {!fixedSellerId && !activeCustomerId && isSeller && (
                  <div style={{ backgroundColor: '#fff3cd', padding: '8px 12px', margin: '8px', border: '1px solid #ffc107', fontSize: '13px' }}>
                    ⚠ 상품 정보를 입력하려면 먼저 <strong>구분</strong>과 <strong>거래처</strong>를 선택해주세요.
                  </div>
                )}

                <div style={{ padding: '10px' }}>
                  {/* 카테고리 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={labelStyle}>카테고리 *</span>
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                      <option value="">카테고리 선택</option>
                      {categoryOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2열 그리드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* 상품명 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>상품명 *</span>
                      <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="상품명 (최대 20자)" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 색깔 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>색깔 *</span>
                      <input type="text" value={color} onChange={e => setColor(e.target.value)} placeholder="색깔 (최대 20자)" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 두께 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>두께 *</span>
                      <input type="text" value={thickness} onChange={e => setThickness(e.target.value)} placeholder="두께 (최대 20자)" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 사이즈 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>사이즈 *</span>
                      <input type="text" value={size} onChange={e => setSize(e.target.value)} placeholder="사이즈 (예: 100*200)" style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 도수 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>도수</span>
                      <select value={colorCountIdx} onChange={e => setColorCountIdx(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                        {COLOR_COUNT_OPTIONS.map((opt, idx) => (
                          <option key={idx} value={String(idx)}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* 인쇄명 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>인쇄명</span>
                      <input type="text" value={printName} onChange={e => setPrintName(e.target.value)} placeholder="인쇄명 (최대 20자)" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 가공방식 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>가공방식</span>
                      <input type="text" value={processMethod} onChange={e => setProcessMethod(e.target.value)} placeholder="가공방식 (최대 20자)" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 도면첨부 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>도면첨부</span>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={e => setDesignFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', flex: 1 }} />
                    </div>
                    {/* 수량 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={labelStyle}>수량 *</span>
                      <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    {/* 예상단가 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ ...labelStyle, cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} onClick={handleCalculatePrice}>
                        예상단가 *<br /><span style={{ fontSize: '11px' }}>(클릭계산)</span>
                      </span>
                      <input type="number" step="0.1" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0" style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>

                  {/* 예상금액 + 장바구니 추가 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'right' }}>
                      {estimatedAmount.toLocaleString()} 원
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={handleAddToCart}
                        style={{ padding: '6px 20px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}
                      >
                        장바구니 추가
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </td>

            {/* 오른쪽: 장바구니 */}
            <td style={{ width: '40%', verticalAlign: 'top' }}>
              <div style={{ marginTop: '5px' }}>
                <Cart
                  sellerId={activeSellerId || ''}
                  customerId={isSeller ? activeCustomerId : undefined}
                  buyerCompanyId={isBuyer ? user.companyId : undefined}
                  orderStatus={orderStatus}
                  onOrderStatusChange={isSeller ? (v) => setOrderStatus(v) : undefined}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
