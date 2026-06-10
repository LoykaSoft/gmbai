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

  const { data, error } = await supabase
    .from('blacklist_words')
    .select('*')
    .eq('firm_id', firmId)
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
  const word = body?.word
  if (typeof word !== 'string' || !word.trim()) {
    return NextResponse.json({ error: 'Word required' }, { status: 400 })
  }
  if (word.trim().length > 100) {
    return NextResponse.json({ error: 'Kelime çok uzun (en fazla 100 karakter)' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('blacklist_words')
    .insert({ firm_id: firmId, word: word.trim().toLowerCase() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Bu kelime zaten listede' }, { status: 409 })
    }
    console.error('blacklist POST error:', error)
    return NextResponse.json({ error: 'Kelime eklenemedi' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
