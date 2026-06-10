import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveLocationResourceName } from '@/lib/gmb'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const placeId: string | undefined = body?.place_id
  const placeName: string | undefined = body?.place_name
  const placeAddress: string | undefined = body?.place_address

  if (!placeId || typeof placeId !== 'string' || !placeId.trim() || placeId.length > 512) {
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

  // Places place_id tek başına yetmez: GMB API'leri "accounts/{id}/locations/{id}"
  // kaynak adı ister. Seçilen işletmeyi bağlı Google hesabının konumlarıyla eşleştir.
  // Bu aynı zamanda kullanıcının sahibi olmadığı bir işletmeyi seçmesini engeller.
  const { resourceName, error: resolveError } = await resolveLocationResourceName(
    profile.firm_id,
    placeId.trim()
  )

  if (resolveError === 'not_connected') {
    return NextResponse.json({ error: 'Google hesabı bağlı değil' }, { status: 400 })
  }
  if (resolveError) {
    return NextResponse.json(
      { error: 'Google hesabınıza ulaşılamadı, lütfen tekrar deneyin.' },
      { status: 502 }
    )
  }
  if (!resourceName) {
    return NextResponse.json(
      { error: 'Bu işletme bağlı Google hesabınızda bulunamadı. Lütfen yönettiğiniz bir işletme seçin.' },
      { status: 422 }
    )
  }

  const { error } = await supabase
    .from('firms')
    .update({
      gmb_location_id: resourceName,
      gmb_place_name: typeof placeName === 'string' ? placeName.slice(0, 300) : null,
      gmb_place_address: typeof placeAddress === 'string' ? placeAddress.slice(0, 500) : null,
      gmb_account_selection_pending: false,
    })
    .eq('id', profile.firm_id)

  if (error) {
    return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
