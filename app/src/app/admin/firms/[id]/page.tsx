import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Firm, Review } from '@/lib/types'
import FirmDetailClient from './FirmDetailClient'

export default async function FirmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: firm }, { data: reviews }, { data: usageData }] = await Promise.all([
    supabase.from('firms').select('*').eq('id', id).single(),
    supabase.from('reviews').select('*').eq('firm_id', id).order('review_date', { ascending: false }),
    supabase.from('usage_logs').select('total_tokens, cost_usd').eq('firm_id', id),
  ])

  if (!firm) notFound()

  const totalTokens = usageData?.reduce((s, r) => s + (r.total_tokens ?? 0), 0) ?? 0
  const totalCost = usageData?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0

  return (
    <FirmDetailClient
      firm={firm as Firm}
      reviews={(reviews as Review[]) ?? []}
      totalTokens={totalTokens}
      totalCost={totalCost}
    />
  )
}
