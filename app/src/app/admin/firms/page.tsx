import { createClient } from '@/lib/supabase/server'
import { Firm } from '@/lib/types'
import FirmsClient from './FirmsClient'

export default async function FirmsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('firms')
    .select('id, name, sector, approval_mode, response_length, is_active, created_at, gmb_location_id, gmb_access_token')
    .order('created_at', { ascending: false })

  // Strip real token — client only needs the boolean
  const firms = (data ?? []).map(f => ({
    ...f,
    gmb_access_token: f.gmb_access_token ? '1' : null,
    gmb_refresh_token: null,
  }))

  return <FirmsClient initialFirms={firms as unknown as Firm[]} />
}
