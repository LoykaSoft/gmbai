import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ places: [] })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Places API key eksik' }, { status: 500 })

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'tr',
      maxResultCount: 5,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Arama başarısız' }, { status: 502 })
  }

  const data = await res.json()
  const places = (data.places ?? []).map((p: {
    id: string
    displayName?: { text: string }
    formattedAddress?: string
    googleMapsUri?: string
  }) => ({
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    mapsUrl: p.googleMapsUri ?? '',
  }))

  return NextResponse.json({ places })
}
