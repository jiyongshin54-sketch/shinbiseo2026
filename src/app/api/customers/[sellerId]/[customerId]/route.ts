import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/customers/[sellerId]/[customerId] - 고객 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string; customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerId, customerId } = await params

  try {
    const body = await request.json()

    // level1, level2가 전달된 경우 빈 값 불허
    if (('level1' in body && !body.level1) || ('level2' in body && !body.level2)) {
      return NextResponse.json({ error: '일반가 등급(level1)과 마대가 등급(level2)은 필수입니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('customers')
      .update({
        ...body,
        last_modify_time: new Date().toISOString(),
      })
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH customer error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/customers/[sellerId]/[customerId] - 고객 소프트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string; customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerId, customerId } = await params

  try {
    // 1. 기존 고객 데이터 조회
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)
      .single()

    if (fetchError || !customer) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 2. customers_deleted에 복사
    const { data: dbUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_uid', user.id)
      .single()

    const { error: insertError } = await supabase
      .from('customers_deleted')
      .insert({
        ...customer,
        deleted_time: new Date().toISOString(),
        deleter_id: dbUser?.user_id || '',
      })

    if (insertError) throw insertError

    // 3. customers에서 삭제
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE customer error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
