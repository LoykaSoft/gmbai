import { createClient as createServiceClient } from '@supabase/supabase-js'

// Google My Business yardımcıları — yalnızca sunucu tarafında kullanılır.
// Token'lar service client ile okunur ve asla istemciye dönmez.

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
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
  const data = await res.json()
  return typeof data.access_token === 'string' ? data.access_token : null
}

interface FirmGmb {
  gmb_access_token: string | null
  gmb_refresh_token: string | null
  gmb_location_id: string | null
}

// Geçerli bir access token ile fn'i çağırır; 401'de token'ı yenileyip bir kez daha dener.
// Yenilenen token DB'ye yazılır ki n8n ve sonraki istekler de kullanabilsin.
async function withFirmAccessToken(
  firmId: string,
  fn: (accessToken: string) => Promise<Response>
): Promise<{ res: Response | null; error: string | null }> {
  const service = getServiceClient()
  const { data: firm } = await service
    .from('firms')
    .select('gmb_access_token, gmb_refresh_token, gmb_location_id')
    .eq('id', firmId)
    .single<FirmGmb>()

  if (!firm?.gmb_access_token) return { res: null, error: 'not_connected' }

  let res = await fn(firm.gmb_access_token)
  if (res.status === 401 && firm.gmb_refresh_token) {
    const refreshed = await refreshAccessToken(firm.gmb_refresh_token)
    if (!refreshed) return { res: null, error: 'token_refresh_failed' }
    await service.from('firms').update({ gmb_access_token: refreshed }).eq('id', firmId)
    res = await fn(refreshed)
  }
  return { res, error: null }
}

// Yorum cevabını Google My Business'a yayınlar.
export async function publishReplyToGmb(
  firmId: string,
  gmbReviewId: string,
  comment: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = getServiceClient()
  const { data: firm } = await service
    .from('firms')
    .select('gmb_location_id')
    .eq('id', firmId)
    .single()

  // GMB v4 reviews API "accounts/{id}/locations/{id}" kaynak yolu bekler
  if (!firm?.gmb_location_id?.startsWith('accounts/')) {
    return { ok: false, error: 'location_not_resolved' }
  }

  const url = `https://mybusiness.googleapis.com/v4/${firm.gmb_location_id}/reviews/${encodeURIComponent(gmbReviewId)}/reply`
  const { res, error } = await withFirmAccessToken(firmId, token =>
    fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    })
  )

  if (error || !res) return { ok: false, error: error ?? 'unknown' }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('GMB reply publish failed:', res.status, body.slice(0, 500))
    return { ok: false, error: `gmb_${res.status}` }
  }
  return { ok: true }
}

// Places place_id'sini, kullanıcının bağlı GMB hesabındaki
// "accounts/{id}/locations/{id}" kaynak adına çözer.
// İşletme bağlı hesapta yoksa null döner (sahip olunmayan işletme seçilemez).
export async function resolveLocationResourceName(
  firmId: string,
  placeId: string
): Promise<{ resourceName: string | null; error: string | null }> {
  const { res: accountsRes, error: accErr } = await withFirmAccessToken(firmId, token =>
    fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
  )
  if (accErr || !accountsRes?.ok) return { resourceName: null, error: accErr ?? 'accounts_fetch_failed' }

  const accountsData = await accountsRes.json()
  const accounts: { name: string }[] = accountsData.accounts ?? []

  for (const account of accounts) {
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({
        readMask: 'name,metadata',
        pageSize: '100',
      })
      if (pageToken) params.set('pageToken', pageToken)

      const { res, error } = await withFirmAccessToken(firmId, token =>
        fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      )
      if (error || !res?.ok) break

      const data = await res.json()
      const locations: { name: string; title?: string; metadata?: { placeId?: string; mapsUri?: string } }[] = data.locations ?? []

      // placeId ile eşleştir, bulamazsan mapsUri içinde placeId geçiyor mu diye bak
      const match = locations.find(l =>
        l.metadata?.placeId === placeId ||
        l.metadata?.mapsUri?.includes(placeId)
      )
      if (match) {
        // v1 location adı "locations/{id}" — v4 için hesap önekiyle birleştirilir
        return { resourceName: `${account.name}/${match.name}`, error: null }
      }

      // Hâlâ bulunamadıysa ve bu hesapta yalnızca 1 lokasyon varsa onu kullan
      if (locations.length === 1 && accounts.length === 1) {
        return { resourceName: `${account.name}/${locations[0].name}`, error: null }
      }
      pageToken = data.nextPageToken
    } while (pageToken)
  }

  return { resourceName: null, error: null }
}
