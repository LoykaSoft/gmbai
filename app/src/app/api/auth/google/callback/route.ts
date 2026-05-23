import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user.id
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=google_oauth_denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=google_not_configured`)
  }

  // Google'dan token al
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token } = tokens

  if (!access_token || !refresh_token) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=token_exchange_failed`)
  }

  // GMB Account'u al (lokasyon ID)
  let locationId: string | null = null
  try {
    const accountsRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    if (accountsRes.ok) {
      const accounts = await accountsRes.json()
      const firstAccount = accounts.accounts?.[0]
      if (firstAccount) {
        locationId = firstAccount.name
      }
    }
  } catch {
    // Lokasyon ID olmadan devam et, settings'ten güncellenir
  }

  // Supabase'e kaydet
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Require state to prevent CSRF — a missing or mismatched state is always rejected
  if (!user || !state || user.id !== state) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=auth_mismatch`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=no_firm`)
  }

  const { error: updateError } = await supabase
    .from('firms')
    .update({
      gmb_access_token: access_token,
      gmb_refresh_token: refresh_token,
      ...(locationId ? { gmb_location_id: locationId } : {}),
    })
    .eq('id', profile.firm_id)

  if (updateError) {
    return NextResponse.redirect(`${baseUrl}/panel/settings?error=token_save_failed`)
  }

  return NextResponse.redirect(`${baseUrl}/panel/settings?success=google_connected`)
}
