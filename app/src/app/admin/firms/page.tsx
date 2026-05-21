import { createClient } from '@/lib/supabase/server'
import { Firm } from '@/lib/types'
import FirmsClient from './FirmsClient'

export default async function FirmsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('firms')
    .select('*')
    .order('created_at', { ascending: false })

  return <FirmsClient initialFirms={(data as Firm[]) ?? []} />
}
