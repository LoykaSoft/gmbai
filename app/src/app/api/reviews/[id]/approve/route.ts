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

  const { data: review, error: fetchError } = await supabase
    .from('reviews')
    .select('ai_response, edited_response')
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (fetchError || !review) return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 })

  const finalResponse = review.edited_response ?? review.ai_response
  if (finalResponse == null) {
    return NextResponse.json({ error: 'No AI response to publish yet' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({
      status: 'published',
      final_response: finalResponse,
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) {
    console.error('reviews/approve update error:', error)
    return NextResponse.json({ error: 'Yorum onaylanamadı' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Yorum onaylanamaz (zaten işlenmiş)' }, { status: 409 })
  }
  return NextResponse.json(data)
}
