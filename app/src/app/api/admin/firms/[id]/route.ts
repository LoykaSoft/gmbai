import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null }
  }

  return { error: null, supabase }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('firms')
    .select('id, name, sector, approval_mode, response_length, is_active, created_at, gmb_location_id, system_prompt, info_card')
    .eq('id', id)
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name boş olamaz' }, { status: 400 })
    }
    updates.name = body.name.trim().slice(0, 200)
  }
  if ('sector' in body) {
    if (typeof body.sector !== 'string') {
      return NextResponse.json({ error: 'sector metin olmalı' }, { status: 400 })
    }
    updates.sector = body.sector.slice(0, 100)
  }
  if ('approval_mode' in body) {
    if (typeof body.approval_mode !== 'boolean') {
      return NextResponse.json({ error: 'approval_mode boolean olmalı' }, { status: 400 })
    }
    updates.approval_mode = body.approval_mode
  }
  if ('response_length' in body) {
    if (!['short', 'medium', 'long'].includes(body.response_length)) {
      return NextResponse.json({ error: 'Geçersiz response_length' }, { status: 400 })
    }
    updates.response_length = body.response_length
  }
  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active boolean olmalı' }, { status: 400 })
    }
    updates.is_active = body.is_active
  }
  if ('system_prompt' in body) {
    if (body.system_prompt !== null && typeof body.system_prompt !== 'string') {
      return NextResponse.json({ error: 'system_prompt metin olmalı' }, { status: 400 })
    }
    updates.system_prompt = typeof body.system_prompt === 'string'
      ? body.system_prompt.slice(0, 4000)
      : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase!
    .from('firms')
    .update(updates)
    .eq('id', id)
    .select('id, name, sector, approval_mode, response_length, is_active, system_prompt')
    .single()

  if (dbError) {
    console.error('admin/firms PUT error:', dbError)
    return NextResponse.json({ error: 'İşletme güncellenemedi' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { error: dbError } = await supabase!.from('firms').delete().eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
