import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // gmb_access_token ve gmb_refresh_token select'e dahil edilmez — istemciye asla gönderilmez
  const { data: firm, error } = await supabase
    .from('firms')
    .select('id, name, sector, gmb_location_id, approval_mode, response_length, system_prompt, info_card, is_active')
    .eq('id', profile.firm_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // GMB bağlantı durumunu ayrı sorgula (sadece boolean)
  const { data: tokenCheck } = await supabase
    .from('firms')
    .select('gmb_access_token')
    .eq('id', profile.firm_id)
    .single()

  return NextResponse.json({
    ...firm,
    gmb_connected: !!tokenCheck?.gmb_access_token,
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

  const body = await request.json()

  const allowed = ['system_prompt', 'approval_mode', 'response_length', 'info_card']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('firms')
    .update(updates)
    .eq('id', profile.firm_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
