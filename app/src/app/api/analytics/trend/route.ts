import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'monthly' // weekly | monthly

  // Son 12 ay veya 12 hafta
  const since = new Date()
  since.setMonth(since.getMonth() - 12)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, review_date, status')
    .eq('firm_id', profile.firm_id)
    .gte('review_date', since.toISOString())
    .order('review_date', { ascending: true })

  if (!reviews) return NextResponse.json([])

  const buckets = new Map<string, { total: number; count: number; published: number }>()

  for (const r of reviews) {
    const d = new Date(r.review_date)
    let key: string
    if (period === 'weekly') {
      // ISO haftası: YYYY-WNN
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
      key = `${d.getFullYear()}-H${String(week).padStart(2, '0')}`
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    const b = buckets.get(key) ?? { total: 0, count: 0, published: 0 }
    b.total += r.rating
    b.count += 1
    if (['published', 'auto_published'].includes(r.status)) b.published += 1
    buckets.set(key, b)
  }

  const trend = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      avg_rating: Math.round((b.total / b.count) * 10) / 10,
      review_count: b.count,
      published_count: b.published,
    }))

  return NextResponse.json(trend)
}
