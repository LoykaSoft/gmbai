import { createClient } from '@/lib/supabase/server'
import { Review } from '@/lib/types'
import PendingClient from './PendingClient'

export default async function PendingReviewsPage() {
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
    .eq('status', 'pending')
    .order('review_date', { ascending: true })

  return <PendingClient initialReviews={(reviews as Review[]) ?? []} />
}
