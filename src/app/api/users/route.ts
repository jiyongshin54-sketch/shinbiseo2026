import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/users - 사용자 목록 (같은 회사 직원)
// ?company_id=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = request.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ error: 'company_id required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('power', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
