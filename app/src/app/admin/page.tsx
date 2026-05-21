import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, MessageSquare, Zap, Wifi } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: firmCount },
    { count: reviewCount },
    { data: usageData },
    { count: connectedCount },
  ] = await Promise.all([
    supabase.from('firms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reviews').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('usage_logs').select('total_tokens, cost_usd')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('firms').select('*', { count: 'exact', head: true }).not('gmb_access_token', 'is', null),
  ])

  const totalTokens = usageData?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) ?? 0
  const totalCost = usageData?.reduce((sum, row) => sum + (row.cost_usd || 0), 0) ?? 0

  const stats = [
    { title: 'Aktif İşletme', value: firmCount ?? 0, icon: Building2, color: 'text-blue-600' },
    { title: 'Bu Ay Yorum', value: reviewCount ?? 0, icon: MessageSquare, color: 'text-green-600' },
    { title: 'Bu Ay Token', value: totalTokens.toLocaleString('tr-TR'), icon: Zap, color: 'text-yellow-600' },
    { title: 'GMB Bağlı', value: connectedCount ?? 0, icon: Wifi, color: 'text-purple-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Genel Bakış</h1>
        <p className="text-gray-500 mt-1">Platform geneli özet</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Bu Ay Toplam Maliyet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</p>
          <p className="text-xs text-gray-400 mt-1">GPT-4o kullanım maliyeti</p>
        </CardContent>
      </Card>
    </div>
  )
}
