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

  const body = await request.json().catch(() => null)
  const review_text = body?.review_text
  const rating = body?.rating
  if (!review_text || typeof review_text !== 'string') {
    return NextResponse.json({ error: 'review_text required' }, { status: 400 })
  }
  if (review_text.length > 4000) {
    return NextResponse.json({ error: 'Yorum metni çok uzun (en fazla 4000 karakter)' }, { status: 400 })
  }
  const ratingNum = Number(rating)
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'rating must be integer 1-5' }, { status: 400 })
  }

  const [{ data: template }, { data: firm }] = await Promise.all([
    // firm_id IS NULL (sistem şablonu) VEYA kullanıcının kendi firmasına ait olmalı
    supabase.from('templates').select('*').eq('id', id)
      .or(`firm_id.is.null,firm_id.eq.${profile.firm_id}`)
      .single(),
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
  const sentiment = ratingNum <= 2 ? 'olumsuz' : ratingNum === 3 ? 'karışık' : 'olumlu'
  const userPrompt = `${ratingNum} yıldızlı (${sentiment}) müşteri yorumu:
"${review_text}"

Önemli: Yorum içeriğini dikkatlice oku ve tona uygun cevap ver.
- Yorum olumsuz şikayet içeriyorsa: özür dile, sorunu ciddiye aldığını belirt, çözüm için iletişime davet et.
- Yorum olumlu ise: samimi teşekkür et, tekrar davet et.
- Yıldız sayısı ile yorum içeriği çelişiyorsa yorum içeriğini esas al.

${lengthMap[firm.response_length] ?? '3-4 cümle'} uzunluğunda, şablona uygun profesyonel bir cevap yaz. Sadece cevap metnini döndür.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
    })

    const response = completion.choices[0].message.content ?? ''
    const tokensInput = completion.usage?.prompt_tokens ?? 0
    const tokensOutput = completion.usage?.completion_tokens ?? 0
    const costUsd = (tokensInput * 0.0000025) + (tokensOutput * 0.00001)

    return NextResponse.json({
      response,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
    })
  } catch (err) {
    console.error('templates test OpenAI error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'AI cevabı üretilemedi, lütfen tekrar deneyin.' }, { status: 502 })
  }
}
