import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import { BlacklistWord, Firm } from '@/lib/types'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/login')

  const [{ data: firmData }, { data: blacklist }, { data: tokenCheck }] = await Promise.all([
    supabase
      .from('firms')
      .select('id, name, sector, gmb_location_id, gmb_account_selection_pending, approval_mode, response_length, system_prompt, info_card, is_active')
      .eq('id', profile.firm_id)
      .single(),
    supabase
      .from('blacklist_words')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('firms')
      .select('gmb_access_token')
      .eq('id', profile.firm_id)
      .single(),
  ])

  if (!firmData) redirect('/panel')

  // Pass a boolean sentinel — never send the real token to the client
  const firm = { ...firmData, gmb_access_token: tokenCheck?.gmb_access_token ? '1' : null }

  return (
    <SettingsClient
      firm={firm as Firm}
      blacklist={(blacklist ?? []) as BlacklistWord[]}
      successMsg={success}
      errorMsg={error}
    />
  )
}
