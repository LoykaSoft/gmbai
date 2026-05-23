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

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })
  const firmId = profile.firm_id

  const [
    { data: reviews },
    { data: analysis },
    { data: usage },
    { data: criticalReviews },
  ] = await Promise.all([
    supabase.from('reviews')
      .select('id, rating, status, created_at, published_at, review_date')
      .eq('firm_id', firmId),
    supabase.from('review_analysis')
      .select('sentiment, has_critical_keyword')
      .eq('firm_id', firmId),
    supabase.from('usage_logs')
      .select('total_tokens, cost_usd')
      .eq('firm_id', firmId),
    supabase.from('review_analysis')
      .select('review_id, critical_keywords, reviews(reviewer_name, rating, review_text, review_date)')
      .eq('firm_id', firmId)
      .eq('has_critical_keyword', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const total = reviews?.length ?? 0
  const published = reviews?.filter(r => ['published', 'auto_published'].includes(r.status)).length ?? 0
  const pending = reviews?.filter(r => r.status === 'pending').length ?? 0
  const avgRating = total > 0
    ? reviews!.reduce((s, r) => s + r.rating, 0) / total
    : 0

  const starDist = [1, 2, 3, 4, 5].map(star => ({
    star,
    count: reviews?.filter(r => r.rating === star).length ?? 0,
  }))

  const positive = analysis?.filter(a => a.sentiment === 'positive').length ?? 0
  const negative = analysis?.filter(a => a.sentiment === 'negative').length ?? 0
  const neutral = analysis?.filter(a => a.sentiment === 'neutral').length ?? 0

  const totalTokens = usage?.reduce((s, u) => s + (u.total_tokens ?? 0), 0) ?? 0
  const totalCost = usage?.reduce((s, u) => s + (u.cost_usd ?? 0), 0) ?? 0

  return NextResponse.json({
    total_reviews: total,
    published_count: published,
    pending_count: pending,
    response_rate: total > 0 ? Math.round((published / total) * 100) : 0,
    avg_rating: Math.round(avgRating * 10) / 10,
    star_distribution: starDist,
    sentiment: { positive, negative, neutral },
    total_tokens: totalTokens,
    total_cost: totalCost,
    critical_reviews: criticalReviews ?? [],
  })
}
