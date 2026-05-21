import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: review, error: fetchError } = await supabase
    .from('reviews')
    .select('ai_response, edited_response')
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })

  const finalResponse = review.edited_response ?? review.ai_response

  const { data, error } = await supabase
    .from('reviews')
    .update({
      status: 'published',
      final_response: finalResponse,
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
