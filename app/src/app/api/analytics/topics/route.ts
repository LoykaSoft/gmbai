import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  const { data: rows } = await supabase
    .from('review_analysis')
    .select('topics')
    .eq('firm_id', profile.firm_id)

  const counts = new Map<string, number>()
  for (const row of rows ?? []) {
    const topics: string[] = Array.isArray(row.topics) ? row.topics : []
    for (const t of topics) {
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
  }

  const result = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }))

  return NextResponse.json(result)
}
