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

  const [{ data: firm }, { data: blacklist }] = await Promise.all([
    supabase
      .from('firms')
      .select('*')
      .eq('id', profile.firm_id)
      .single(),
    supabase
      .from('blacklist_words')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <SettingsClient
      firm={firm as Firm}
      blacklist={(blacklist ?? []) as BlacklistWord[]}
      successMsg={success}
      errorMsg={error}
    />
  )
}
