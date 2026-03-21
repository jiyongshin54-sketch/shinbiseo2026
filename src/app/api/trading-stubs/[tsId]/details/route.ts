import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trading-stubs/[tsId]/details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tsId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tsId } = await params

  try {
    const { data, error } = await supabase
      .from('trading_stubs_d')
      .select('*')
      .eq('ts_id', tsId)
      .order('sequence', { ascending: true })

    if (error) throw error

    const details = data || []

    // 카테고리명 조회
    const categoryIds = [...new Set(details.map(d => d.category_id).filter(Boolean))]
    let categoryMap: Record<string, string> = {}
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('categories')
        .select('category_id, category_l, category_m, category_s')
        .in('category_id', categoryIds)
      if (categories) {
        categoryMap = Object.fromEntries(
          categories.map(c => [
            c.category_id,
            [c.category_l, c.category_m, c.category_s].filter(Boolean).join(' - ')
          ])
        )
      }
    }

    const enriched = details.map(d => ({
      ...d,
      category_name: categoryMap[d.category_id] || d.category_id || '',
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET trading stub details error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
