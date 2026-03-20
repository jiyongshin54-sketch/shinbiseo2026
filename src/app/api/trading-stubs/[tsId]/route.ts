import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/trading-stubs/[tsId] - 거래명세표 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tsId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tsId } = await params

  try {
    const body = await request.json()
    const { items, ...masterData } = body

    // trading_stubs_m UPDATE
    const { error: masterError } = await supabase
      .from('trading_stubs_m')
      .update({
        ...masterData,
        item_count: items?.length || masterData.item_count || 0,
      })
      .eq('ts_id', tsId)

    if (masterError) throw masterError

    // trading_stubs_d: 기존 삭제 후 재삽입
    if (items && items.length > 0) {
      const { error: deleteError } = await supabase
        .from('trading_stubs_d')
        .delete()
        .eq('ts_id', tsId)
      if (deleteError) throw deleteError

      const detailRows = items.map((item: Record<string, unknown>, idx: number) => ({
        ts_id: tsId,
        sequence: idx + 1,
        ...item,
      }))

      const { error: insertError } = await supabase
        .from('trading_stubs_d')
        .insert(detailRows)
      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH trading stub error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
