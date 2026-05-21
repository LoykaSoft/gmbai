import { createClient } from '@/lib/supabase/server'
import { Review } from '@/lib/types'
import ReviewsClient from './ReviewsClient'

export default async function PanelReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user!.id)
    .single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('firm_id', profile?.firm_id)
    .order('review_date', { ascending: false })
    .limit(200)

  return <ReviewsClient initialReviews={(reviews as Review[]) ?? []} />
}
