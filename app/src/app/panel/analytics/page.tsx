import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient, { type AnalysisRow } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/login')
  const firmId = profile.firm_id

  const since12m = new Date()
  since12m.setMonth(since12m.getMonth() - 12)

  const [
    { data: reviews },
    { data: analysis },
  ] = await Promise.all([
    supabase.from('reviews')
      .select('id, rating, status, review_date, created_at')
      .eq('firm_id', firmId)
      .gte('review_date', since12m.toISOString())
      .order('review_date', { ascending: true }),
    supabase.from('review_analysis')
      .select('sentiment, topics, keywords, has_critical_keyword, critical_keywords, review_id, reviews(reviewer_name, rating, review_text, review_date)')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <AnalyticsClient
      reviews={reviews ?? []}
      analysis={(analysis ?? []) as unknown as AnalysisRow[]}
    />
  )
}
