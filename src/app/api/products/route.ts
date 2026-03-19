import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/products - 제품 목록 조회 (기성품 주문용)
// ?seller_id=xxx&buyer_company_id=xxx (구매회사 ID → Level 조회용)
// &search=키워드 (품명/색깔/사이즈 검색)
// &category_id=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const sellerId = params.get('seller_id')
  const buyerCompanyId = params.get('buyer_company_id')
  const search = params.get('search')
  const categoryId = params.get('category_id')
  const categoryM = params.get('category_m')
  const getCategories = params.get('get_categories')

  // 카테고리 목록만 반환
  if (getCategories === 'true') {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, category_m, category_s')
      .order('category_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  }

  try {
    // 1. 구매회사의 Level1/Level2 조회
    let level1 = '4.0급'
    let level2 = '4.0급'

    if (buyerCompanyId) {
      // customers 테이블에서 seller_id + company_id로 고객 조회
      const { data: customer } = await supabase
        .from('customers')
        .select('customer_id, level1, level2')
        .eq('seller_id', sellerId)
        .eq('company_id', buyerCompanyId)
        .single()

      if (customer) {
        level1 = customer.level1 || '4.0급'
        level2 = customer.level2 || '4.0급'
      }
    }

    // 2. 제품 조회
    let query = supabase
      .from('products')
      .select('*, categories ( category_l, category_m, category_s )')
      .eq('seller_id', sellerId)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (categoryM) {
      // 카테고리 중분류로 필터 (리그라운드용)
      const { data: catIds } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_m', categoryM)
      if (catIds && catIds.length > 0) {
        query = query.in('category_id', catIds.map(c => c.category_id))
      }
    }

    if (search) {
      query = query.or(
        `attribute01.ilike.%${search}%,attribute02.ilike.%${search}%,attribute04.ilike.%${search}%`
      )
    }

    query = query.order('product_id', { ascending: true })

    const { data: products, error } = await query
    if (error) throw error

    // 3. Level → UnitPrice 매핑하여 가격 계산
    const GRADE_MAP: Record<string, string> = {
      '3.8급': 'unit_price01', '3.9급': 'unit_price02', '4.0급': 'unit_price03',
      '4.1급': 'unit_price04', '4.2급': 'unit_price05', '4.3급': 'unit_price06',
      '4.4급': 'unit_price07', '4.5급': 'unit_price08', '4.6급': 'unit_price09',
      '4.7급': 'unit_price10', '4.8급': 'unit_price11', '4.9급': 'unit_price12',
      '5.0급': 'unit_price13',
    }

    const priceCol1 = GRADE_MAP[level1] || 'unit_price03'
    const priceCol2 = GRADE_MAP[level2] || 'unit_price03'

    const enriched = (products || []).map((p: Record<string, unknown>) => ({
      ...p,
      unit_price_level1: Number(p[priceCol1]) || 0,  // 일반가
      unit_price_level2: Number(p[priceCol2]) || 0,  // 마대가
      madae_criteria: p.attribute05 ? parseInt(String(p.attribute05)) || 0 : 0,
      customer_level1: level1,
      customer_level2: level2,
    }))

    return NextResponse.json(enriched)

  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
