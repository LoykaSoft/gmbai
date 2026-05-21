import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, CheckCircle, Star, Zap } from 'lucide-react'

export default async function PanelDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, full_name, firms(name)')
    .eq('id', user!.id)
    .single()

  const firmId = profile?.firm_id
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalReviews },
    { count: pendingCount },
    { data: ratingData },
    { data: usageData },
  ] = await Promise.all([
    supabase.from('reviews').select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId).gte('created_at', monthStart),
    supabase.from('reviews').select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId).eq('status', 'pending'),
    supabase.from('reviews').select('rating').eq('firm_id', firmId).gte('created_at', monthStart),
    supabase.from('usage_logs').select('total_tokens, cost_usd')
      .eq('firm_id', firmId).gte('created_at', monthStart),
  ])

  const avgRating = ratingData?.length
    ? (ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length).toFixed(1)
    : '—'

  const publishedCount = (totalReviews ?? 0) - (pendingCount ?? 0)
  const responseRate = totalReviews
    ? Math.round((publishedCount / totalReviews) * 100)
    : 0

  const totalTokens = usageData?.reduce((s, r) => s + (r.total_tokens || 0), 0) ?? 0
  const totalCost = usageData?.reduce((s, r) => s + (r.cost_usd || 0), 0) ?? 0

  const firmName = (profile?.firms as unknown as { name: string } | null)?.name ?? 'İşletmeniz'

  const stats = [
    { title: 'Bu Ay Yorum', value: totalReviews ?? 0, icon: MessageSquare, color: 'text-blue-600' },
    { title: 'Cevaplanma Oranı', value: `%${responseRate}`, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Ortalama Puan', value: avgRating, icon: Star, color: 'text-yellow-500' },
    { title: 'Bu Ay Token', value: totalTokens.toLocaleString('tr-TR'), icon: Zap, color: 'text-purple-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{firmName}</h1>
        <p className="text-gray-500 mt-1">Bu ayki özet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
              <Icon className={`w-5 h-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(pendingCount ?? 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-800 font-medium">
              {pendingCount} adet yorum onayınızı bekliyor.
            </p>
            <a href="/panel/reviews/pending" className="text-orange-600 text-sm underline mt-1 inline-block">
              Bekleyen onaylara git →
            </a>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Bu Ay Tahmini Maliyet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</p>
          <p className="text-xs text-gray-400 mt-1">GPT-4o kullanım maliyeti</p>
        </CardContent>
      </Card>
    </div>
  )
}
