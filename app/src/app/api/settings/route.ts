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

  const { data: firm, error } = await supabase
    .from('firms')
    .select('id, name, sector, gmb_location_id, gmb_access_token, approval_mode, response_length, system_prompt, info_card, is_active')
    .eq('id', profile.firm_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Token varlığını bool olarak döndür, token değerini açıkta bırakma
  return NextResponse.json({
    ...firm,
    gmb_connected: !!firm.gmb_access_token,
    gmb_access_token: undefined,
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
