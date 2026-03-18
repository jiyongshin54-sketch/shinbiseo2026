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
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET trading stub details error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
