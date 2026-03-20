import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/products/[sellerId]/[productId] - 상품 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string; productId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerId, productId } = await params

  try {
    const body = await request.json()

    const { data: dbUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_uid', user.id)
      .single()

    const { error } = await supabase
      .from('products')
      .update({
        ...body,
        modifier_id: dbUser?.user_id || '',
        modify_time: new Date().toISOString(),
      })
      .eq('seller_id', sellerId)
      .eq('product_id', productId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH product error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/products/[sellerId]/[productId] - 상품 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string; productId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerId, productId } = await params

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('seller_id', sellerId)
      .eq('product_id', productId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE product error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
