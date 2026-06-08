import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const accountName: string | undefined = body?.account_name

  // "accounts/123456789" formatında olmalı
  if (!accountName || !/^accounts\/\d+$/.test(accountName)) {
    return NextResponse.json({ error: 'Geçersiz hesap adı' }, { status: 400 })
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
      gmb_location_id: accountName,
      gmb_account_selection_pending: false,
    })
    .eq('id', profile.firm_id)

  if (error) {
    return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
