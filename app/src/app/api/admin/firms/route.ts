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

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('firms')
    .select('id, name, sector, approval_mode, response_length, is_active, created_at, gmb_location_id')
    .order('created_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  if ('response_length' in body && !['short', 'medium', 'long'].includes(body.response_length)) {
    return NextResponse.json({ error: 'Geçersiz response_length' }, { status: 400 })
  }
  if ('approval_mode' in body && typeof body.approval_mode !== 'boolean') {
    return NextResponse.json({ error: 'approval_mode boolean olmalı' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase!
    .from('firms')
    .insert({
      name: body.name.trim().slice(0, 200),
      sector: typeof body.sector === 'string' ? body.sector.slice(0, 100) : 'diger',
      approval_mode: body.approval_mode ?? true,
      response_length: body.response_length ?? 'medium',
      is_active: true,
    })
    .select('id, name, sector, approval_mode, response_length, is_active, created_at')
    .single()

  if (dbError) {
    console.error('admin/firms POST error:', dbError)
    return NextResponse.json({ error: 'İşletme oluşturulamadı' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
