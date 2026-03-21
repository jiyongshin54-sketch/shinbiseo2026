import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 공지사항 목록 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('companyannouncements')
    .select('*')
    .eq('companyid', companyId)
    .eq('isactive', true)
    .or(`startdate.is.null,startdate.lte.${today}`)
    .or(`enddate.is.null,enddate.gte.${today}`)
    .order('priority', { ascending: false })
    .order('createdat', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST: 공지사항 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { companyid, title, content, type, color, priority, createdby, startdate, enddate } = body

  if (!companyid || !title || !content) {
    return NextResponse.json({ error: 'companyid, title, content are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('companyannouncements')
    .insert([{
      companyid,
      title,
      content,
      type: type || 'normal',
      color: color || '#3B82F6',
      priority: priority || 0,
      createdby: createdby || 'admin',
      startdate: startdate || null,
      enddate: enddate || null,
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH: 공지사항 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { announcementid, ...updateData } = body

  if (!announcementid) {
    return NextResponse.json({ error: 'announcementid is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('companyannouncements')
    .update(updateData)
    .eq('announcementid', announcementid)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: 공지사항 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const announcementId = searchParams.get('id')

  if (!announcementId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('companyannouncements')
    .delete()
    .eq('announcementid', announcementId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
