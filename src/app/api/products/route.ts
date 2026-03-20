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

  // 풍원 회사 ID (등급별 단가를 사용하는 유일한 판매회사)
  const PUNGWON_ID = '00002'

  try {
    // 1. 구매회사의 Level1/Level2 조회
    // 비풍원: 등급 구분 없이 항상 UnitPrice01(3.8급) 사용
    // 풍원: 고객별 Level1/Level2로 등급별 단가 적용
    let level1 = '3.8급'
    let level2 = '3.8급'

    if (sellerId === PUNGWON_ID && buyerCompanyId) {
      // 풍원만 고객별 등급 조회
      const { data: customer } = await supabase
        .from('customers')
        .select('customer_id, level1, level2')
        .eq('seller_id', sellerId)
        .eq('company_id', buyerCompanyId)
        .single()

      if (customer) {
        level1 = customer.level1 || '0.0급'
        level2 = customer.level2 || '0.0급'
      }
    } else if (sellerId === PUNGWON_ID && !buyerCompanyId) {
      // 풍원인데 구매회사 미지정 → 등급 미확정
      level1 = '0.0급'
      level2 = '0.0급'
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

    // 3. Level → UnitPrice 매핑하여 가격 계산 (3.8급~5.7급, UnitPrice01~20)
    const GRADE_MAP: Record<string, string> = {
      '3.8급': 'unit_price01', '3.9급': 'unit_price02', '4.0급': 'unit_price03',
      '4.1급': 'unit_price04', '4.2급': 'unit_price05', '4.3급': 'unit_price06',
      '4.4급': 'unit_price07', '4.5급': 'unit_price08', '4.6급': 'unit_price09',
      '4.7급': 'unit_price10', '4.8급': 'unit_price11', '4.9급': 'unit_price12',
      '5.0급': 'unit_price13', '5.1급': 'unit_price14', '5.2급': 'unit_price15',
      '5.3급': 'unit_price16', '5.4급': 'unit_price17', '5.5급': 'unit_price18',
      '5.6급': 'unit_price19', '5.7급': 'unit_price20',
    }

    // 비풍원: 3.8급 → unit_price01 (항상 첫 번째 단가)
    // 풍원 Level 미설정(0.0급): GRADE_MAP에 없으므로 null → 0원 처리
    const priceCol1 = GRADE_MAP[level1] || null
    const priceCol2 = GRADE_MAP[level2] || null

    const enriched = (products || []).map((p: Record<string, unknown>) => ({
      ...p,
      unit_price_level1: priceCol1 ? Number(p[priceCol1]) || 0 : 0,  // 일반가 (0.0급이면 0원)
      unit_price_level2: priceCol2 ? Number(p[priceCol2]) || 0 : 0,  // 마대가 (0.0급이면 0원)
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

// POST /api/products - 상품 추가
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { seller_id, ...productData } = body

    if (!seller_id) {
      return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
    }

    // product_id 자동 채번 (seller_id 기준 MAX+1)
    const { data: maxProduct } = await supabase
      .from('products')
      .select('product_id')
      .eq('seller_id', seller_id)
      .order('product_id', { ascending: false })
      .limit(1)
      .single()

    const nextId = maxProduct
      ? String(parseInt(maxProduct.product_id) + 1).padStart(5, '0')
      : '00001'

    // 중복 체크 (품명+색깔+두께+사이즈)
    if (productData.attribute01 && productData.attribute03 && productData.attribute04) {
      const { data: dup } = await supabase
        .from('products')
        .select('product_id')
        .eq('seller_id', seller_id)
        .eq('attribute01', productData.attribute01)
        .eq('attribute02', productData.attribute02 || '')
        .eq('attribute03', productData.attribute03)
        .eq('attribute04', productData.attribute04)
        .limit(1)

      if (dup && dup.length > 0) {
        return NextResponse.json({ error: '동일 상품(품명+색깔+두께+사이즈)이 이미 존재합니다.' }, { status: 400 })
      }
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_uid', user.id)
      .single()

    const { data, error } = await supabase.from('products').insert({
      seller_id,
      product_id: nextId,
      ...productData,
      register_id: dbUser?.user_id || '',
      register_time: new Date().toISOString(),
    }).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
