import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
  if (!isStr(body.name) || !isStr(body.opening) || !isStr(body.body) || !isStr(body.closing)) {
    return NextResponse.json({ error: 'Şablon adı ve metin alanları zorunludur' }, { status: 400 })
  }
  if (!['1-2', '3-4', '5'].includes(body.rating_range)) {
    return NextResponse.json({ error: 'Geçersiz puan aralığı' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('templates')
    .update({
      name: body.name,
      rating_range: body.rating_range,
      topic: isStr(body.topic) ? body.topic : 'genel',
      opening: body.opening,
      body: body.body,
      closing: body.closing,
    })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .eq('is_system', false)
    .select()
    .maybeSingle()

  if (error) {
    console.error('templates PUT error:', error)
    return NextResponse.json({ error: 'Şablon güncellenemedi' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .eq('is_system', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
