import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/companies/[companyId] - 회사 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId } = await params

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET company error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/companies/[companyId] - 회사 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId } = await params

  try {
    const body = await request.json()
    // power, status 같은 민감 필드는 수정 불가
    const { power: _p, status: _s, company_id: _id, ...safeFields } = body

    const { error } = await supabase
      .from('companies')
      .update(safeFields)
      .eq('company_id', companyId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH company error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
