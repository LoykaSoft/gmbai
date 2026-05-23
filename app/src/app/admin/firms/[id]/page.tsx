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

  const [{ data: firmData }, { data: reviews }, { data: usageData }] = await Promise.all([
    supabase
      .from('firms')
      .select('id, name, sector, approval_mode, response_length, is_active, created_at, gmb_location_id, gmb_access_token, system_prompt, info_card')
      .eq('id', id)
      .single(),
    supabase.from('reviews').select('*').eq('firm_id', id).order('review_date', { ascending: false }),
    supabase.from('usage_logs').select('total_tokens, cost_usd').eq('firm_id', id),
  ])

  if (!firmData) notFound()

  // Strip real token — client only needs the boolean
  const firm = { ...firmData, gmb_access_token: firmData.gmb_access_token ? '1' : null, gmb_refresh_token: null }

  const totalTokens = usageData?.reduce((s, r) => s + (r.total_tokens ?? 0), 0) ?? 0
  const totalCost = usageData?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0

  return (
    <FirmDetailClient
      firm={firm as unknown as Firm}
      reviews={(reviews as Review[]) ?? []}
      totalTokens={totalTokens}
      totalCost={totalCost}
    />
  )
}
