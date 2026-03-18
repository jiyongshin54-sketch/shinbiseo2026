import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/users/[userId]/status - 사용자 상태/권한 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  try {
    const body = await request.json()
    const { status, power, approve_id } = body

    const updateFields: Record<string, unknown> = {}
    if (status) updateFields.status = status
    if (power) updateFields.power = power
    if (status === '승인') {
      updateFields.approve_id = approve_id
      updateFields.approve_time = new Date().toISOString()
    }

    const { error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH user status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/users/[userId]/status - 사용자 소프트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  try {
    // 기존 사용자 조회
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 삭제자 정보
    const { data: deleter } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_uid', authUser.id)
      .single()

    // users_deleted에 복사
    const { error: insertError } = await supabase
      .from('users_deleted')
      .insert({
        ...targetUser,
        auth_uid: undefined, // UUID는 deleted에 없음
        deleted_time: new Date().toISOString(),
        deleter_id: deleter?.user_id || '',
      })

    if (insertError) throw insertError

    // users에서 삭제
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE user error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
