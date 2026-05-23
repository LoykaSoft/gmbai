import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplatesClient from './TemplatesClient'
import { Template } from '@/lib/types'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/login')

  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .or(`firm_id.is.null,firm_id.eq.${profile.firm_id}`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false })

  return <TemplatesClient initialTemplates={(templates ?? []) as Template[]} />
}
