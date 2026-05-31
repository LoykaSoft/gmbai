import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 404 })

  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) {
    console.error('reviews/reject update error:', error)
    return NextResponse.json({ error: 'Yorum reddedilemedi' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Yorum reddedilemez (zaten işlenmiş)' }, { status: 409 })
  }
  return NextResponse.json(data)
}
