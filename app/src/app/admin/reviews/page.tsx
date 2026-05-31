import { createClient } from '@/lib/supabase/server'
import { Firm, Review } from '@/lib/types'
import ReviewsClient from './ReviewsClient'

type ReviewWithFirm = Review & { firms: { name: string } }

export default async function AdminReviewsPage() {
  const supabase = await createClient()

  const [{ data: reviews }, { data: firms }] = await Promise.all([
    supabase
      .from('reviews')
      .select('*, firms(name)')
      .order('review_date', { ascending: false })
      .limit(500),
    supabase.from('firms').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <ReviewsClient
      reviews={(reviews as ReviewWithFirm[]) ?? []}
      firms={(firms as Firm[]) ?? []}
    />
  )
}
