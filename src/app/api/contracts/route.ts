import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/contracts - 계약 목록 조회
// ?buyer_id=xxx (구매회사 → 계약된 판매회사 목록)
// ?seller_id=xxx (판매회사 → 계약된 구매회사 목록)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const buyerId = params.get('buyer_id')
  const sellerId = params.get('seller_id')

  try {
    if (buyerId) {
      const { data, error } = await supabase
        .from('contracts')
        .select('seller_id, customer_id, seller_alias')
        .eq('buyer_id', buyerId)

      if (error) throw error
      return NextResponse.json(data || [])
    }

    if (sellerId) {
      const { data, error } = await supabase
        .from('contracts')
        .select('buyer_id, customer_id, seller_alias')
        .eq('seller_id', sellerId)

      if (error) throw error
      return NextResponse.json(data || [])
    }

    return NextResponse.json({ error: 'buyer_id or seller_id required' }, { status: 400 })

  } catch (error) {
    console.error('GET /api/contracts error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
