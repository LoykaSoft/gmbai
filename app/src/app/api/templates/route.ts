import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getFirmId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', userId)
    .single()
  return data?.firm_id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  // Sistem şablonları + işletmenin kendi şablonları
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .or(`firm_id.is.null,firm_id.eq.${firmId}`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 404 })

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
    .insert({
      firm_id: firmId,
      name: body.name,
      sector: isStr(body.sector) ? body.sector : null,
      rating_range: body.rating_range,
      topic: isStr(body.topic) ? body.topic : 'genel',
      opening: body.opening,
      body: body.body,
      closing: body.closing,
      is_system: false,
    })
    .select()
    .single()

  if (error) {
    console.error('templates POST error:', error)
    return NextResponse.json({ error: 'Şablon oluşturulamadı' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
