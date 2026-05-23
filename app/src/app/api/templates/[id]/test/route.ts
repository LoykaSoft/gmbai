import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(
  request: Request,
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

  const { review_text, rating } = await request.json()
  if (!review_text) return NextResponse.json({ error: 'review_text required' }, { status: 400 })

  const [{ data: template }, { data: firm }] = await Promise.all([
    supabase.from('templates').select('*').eq('id', id).single(),
    supabase.from('firms').select('name, sector, system_prompt, info_card, response_length').eq('id', profile.firm_id).single(),
  ])

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const infoCard = firm.info_card as Record<string, string> | null

  const systemPrompt = `Sen ${firm.name} adına cevap veren bir müşteri hizmetleri asistanısın.
${firm.system_prompt ?? ''}
${infoCard?.address ? `Adres: ${infoCard.address}` : ''}
${infoCard?.hours ? `Çalışma saatleri: ${infoCard.hours}` : ''}
${infoCard?.highlights ? `Öne çıkan ürünler/hizmetler: ${infoCard.highlights}` : ''}
${infoCard?.faq ? `Sık sorulan sorular: ${infoCard.faq}` : ''}
${infoCard?.forbidden_info ? `Kesinlikle söyleme: ${infoCard.forbidden_info}` : ''}

Şablon:
Açılış: ${template.opening}
Gövde yönlendirme: ${template.body}
Kapanış: ${template.closing}`

  const lengthMap: Record<string, string> = {
    short: '1-2 cümle',
    medium: '3-4 cümle',
    long: 'detaylı, 5+ cümle',
  }
  const userPrompt = `${rating} yıldızlı müşteri yorumu:
"${review_text}"

Yukarıdaki yoruma ${lengthMap[firm.response_length] ?? '3-4 cümle'} uzunluğunda, şablona uygun profesyonel bir cevap yaz. Sadece cevap metnini döndür.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
  })

  const response = completion.choices[0].message.content
  const tokensInput = completion.usage?.prompt_tokens ?? 0
  const tokensOutput = completion.usage?.completion_tokens ?? 0
  const costUsd = (tokensInput * 0.0000025) + (tokensOutput * 0.00001)

  return NextResponse.json({
    response,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: costUsd,
  })
}
