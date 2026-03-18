import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/customers - 고객(거래처) 목록 조회
// ?seller_id=xxx (필수)
// &search=키워드 (고객명/사업자번호)
// &status=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const sellerId = params.get('seller_id')
  const search = params.get('search')
  const status = params.get('status')

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('seller_id', sellerId)

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,business_id.ilike.%${search}%`
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('customer_name', { ascending: true })

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('GET /api/customers error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/customers - 새 고객 등록
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { seller_id, ...customerData } = body

    // customer_id 자동 채번 (seller_id 기준 MAX+1)
    const { data: maxCustomer } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('seller_id', seller_id)
      .order('customer_id', { ascending: false })
      .limit(1)
      .single()

    const nextId = maxCustomer
      ? String(parseInt(maxCustomer.customer_id) + 1).padStart(5, '0')
      : '00001'

    const { data, error } = await supabase.from('customers').insert({
      seller_id,
      customer_id: nextId,
      ...customerData,
      register_time: new Date().toISOString(),
    }).select().single()

    if (error) throw error

    return NextResponse.json(data)

  } catch (error) {
    console.error('POST /api/customers error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
