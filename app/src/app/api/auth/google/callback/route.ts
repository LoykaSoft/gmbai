import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const OAUTH_STATE_COOKIE = 'gmb_oauth_state'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const redirectWithCleanup = (path: string) => {
    const res = NextResponse.redirect(`${baseUrl}${path}`)
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  if (error || !code) {
    return redirectWithCleanup('/panel/settings?error=google_oauth_denied')
  }

  // CSRF koruması: state, OAuth başlangıcında set edilen nonce cookie'siyle eşleşmeli
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!state || !expectedState || state !== expectedState) {
    return redirectWithCleanup('/panel/settings?error=auth_mismatch')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithCleanup('/panel/settings?error=google_not_configured')
  }

  // Token değişiminden önce oturumu doğrula — code'u boşa harcama
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirectWithCleanup('/panel/settings?error=auth_mismatch')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return redirectWithCleanup('/panel/settings?error=no_firm')
  }

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
    return redirectWithCleanup('/panel/settings?error=token_exchange_failed')
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token } = tokens

  if (!access_token || !refresh_token) {
    return redirectWithCleanup('/panel/settings?error=token_exchange_failed')
  }

  const serviceClient = getServiceClient()
  const { data: savedRows, error: updateError } = await serviceClient
    .from('firms')
    .update({
      gmb_access_token: access_token,
      gmb_refresh_token: refresh_token,
      gmb_account_selection_pending: true,
      gmb_accounts: null,
    })
    .eq('id', profile.firm_id)
    .select('id')

  if (updateError || !savedRows?.length) {
    return redirectWithCleanup('/panel/settings?error=token_save_failed')
  }

  return redirectWithCleanup('/panel/settings?success=google_connected')
}
