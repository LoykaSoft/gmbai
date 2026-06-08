import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'Firma bulunamadı' }, { status: 404 })
  }

  const { data: firm } = await supabase
    .from('firms')
    .select('gmb_access_token, gmb_refresh_token')
    .eq('id', profile.firm_id)
    .single()

  if (!firm?.gmb_access_token) {
    return NextResponse.json({ error: 'Google hesabı bağlı değil' }, { status: 400 })
  }

  // Gerekirse token'ı yenile
  let accessToken = firm.gmb_access_token
  const accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (accountsRes.status === 401 && firm.gmb_refresh_token) {
    const refreshed = await refreshAccessToken(firm.gmb_refresh_token)
    if (!refreshed) {
      return NextResponse.json({ error: 'Token yenilenemedi' }, { status: 401 })
    }
    accessToken = refreshed.access_token
    await supabase
      .from('firms')
      .update({ gmb_access_token: accessToken })
      .eq('id', profile.firm_id)

    const retryRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!retryRes.ok) {
      return NextResponse.json({ error: 'GMB hesapları alınamadı' }, { status: 502 })
    }
    const data = await retryRes.json()
    return NextResponse.json({ accounts: data.accounts ?? [] })
  }

  if (!accountsRes.ok) {
    return NextResponse.json({ error: 'GMB hesapları alınamadı' }, { status: 502 })
  }

  const data = await accountsRes.json()
  return NextResponse.json({ accounts: data.accounts ?? [] })
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<{ access_token: string }>
}
