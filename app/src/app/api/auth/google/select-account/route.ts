import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const placeId: string | undefined = body?.place_id
  const placeName: string | undefined = body?.place_name
  const placeAddress: string | undefined = body?.place_address

  if (!placeId || typeof placeId !== 'string' || !placeId.trim()) {
    return NextResponse.json({ error: 'Geçersiz işletme seçimi' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'Firma bulunamadı' }, { status: 404 })
  }

  const { error } = await supabase
    .from('firms')
    .update({
      gmb_location_id: placeId,
      gmb_place_name: placeName ?? null,
      gmb_place_address: placeAddress ?? null,
      gmb_account_selection_pending: false,
    })
    .eq('id', profile.firm_id)

  if (error) {
    return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
