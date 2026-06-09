import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
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
    .select('gmb_access_token, gmb_refresh_token, gmb_accounts')
    .eq('id', profile.firm_id)
    .single()

  if (!firm?.gmb_access_token) {
    return NextResponse.json({ error: 'Google hesabı bağlı değil' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === '1'

  // Cache'den dön, Google API'ye gitme
  if (!forceRefresh && firm.gmb_accounts) {
    return NextResponse.json({ accounts: firm.gmb_accounts, cached: true })
  }

  // Google API'den taze çek
  let accessToken = firm.gmb_access_token
  const accounts = await fetchAccounts(accessToken)

  if (accounts === 'rate_limited') {
    return NextResponse.json(
      { error: 'Google API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.', code: 'rate_limited' },
      { status: 429 }
    )
  }

  if (accounts === 'unauthorized' && firm.gmb_refresh_token) {
    const refreshed = await refreshAccessToken(firm.gmb_refresh_token)
    if (!refreshed) {
      return NextResponse.json({ error: 'Token yenilenemedi' }, { status: 401 })
    }
    accessToken = refreshed.access_token
    const retried = await fetchAccounts(accessToken)

    if (retried === 'rate_limited') {
      return NextResponse.json(
        { error: 'Google API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.', code: 'rate_limited' },
        { status: 429 }
      )
    }
    if (retried === 'unauthorized' || retried === 'error') {
      return NextResponse.json({ error: 'GMB hesapları alınamadı' }, { status: 502 })
    }

    const serviceClient = getServiceClient()
    await serviceClient
      .from('firms')
      .update({ gmb_access_token: accessToken, gmb_accounts: retried })
      .eq('id', profile.firm_id)

    return NextResponse.json({ accounts: retried })
  }

  if (accounts === 'unauthorized' || accounts === 'error') {
    return NextResponse.json({ error: 'GMB hesapları alınamadı' }, { status: 502 })
  }

  // Cache'i güncelle
  const serviceClient = getServiceClient()
  await serviceClient
    .from('firms')
    .update({ gmb_accounts: accounts })
    .eq('id', profile.firm_id)

  return NextResponse.json({ accounts })
}

async function fetchAccounts(accessToken: string) {
  try {
    const res = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (res.status === 429) return 'rate_limited' as const
    if (res.status === 401) return 'unauthorized' as const
    if (!res.ok) return 'error' as const
    const data = await res.json()
    return data.accounts ?? []
  } catch {
    return 'error' as const
  }
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
