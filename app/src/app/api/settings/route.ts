import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FIRM_FIELDS = 'id, name, sector, gmb_location_id, approval_mode, response_length, system_prompt, info_card, is_active'
const INFO_CARD_KEYS = ['address', 'hours', 'highlights', 'faq', 'forbidden_info'] as const

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  // Token select edilir ama yalnızca boolean'a indirgenir — istemciye asla gönderilmez
  const { data: firm, error } = await supabase
    .from('firms')
    .select(`${FIRM_FIELDS}, gmb_access_token`)
    .eq('id', profile.firm_id)
    .single()

  if (error) return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 })

  const { gmb_access_token, ...safeFirm } = firm

  return NextResponse.json({
    ...safeFirm,
    gmb_connected: !!gmb_access_token,
  })
}

export async function PUT(request: Request) {
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

  const updates: Record<string, unknown> = {}

  if ('system_prompt' in body) {
    if (body.system_prompt !== null && typeof body.system_prompt !== 'string') {
      return NextResponse.json({ error: 'system_prompt metin olmalı' }, { status: 400 })
    }
    updates.system_prompt = typeof body.system_prompt === 'string'
      ? body.system_prompt.slice(0, 4000)
      : null
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

  if ('info_card' in body) {
    if (!body.info_card || typeof body.info_card !== 'object' || Array.isArray(body.info_card)) {
      return NextResponse.json({ error: 'info_card nesne olmalı' }, { status: 400 })
    }
    const infoCard: Record<string, string> = {}
    for (const key of INFO_CARD_KEYS) {
      const val = (body.info_card as Record<string, unknown>)[key]
      if (typeof val === 'string') infoCard[key] = val.slice(0, 2000)
    }
    updates.info_card = infoCard
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('firms')
    .update(updates)
    .eq('id', profile.firm_id)
    .select(FIRM_FIELDS)
    .single()

  if (error) {
    console.error('settings PUT error:', error)
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 })
  }
  return NextResponse.json(data)
}
