import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Zap, DollarSign, MessageSquare, TrendingUp } from 'lucide-react'

export default async function PanelUsagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user!.id)
    .single()

  const firmId = profile?.firm_id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: monthLogs }, { data: allLogs }] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('*')
      .eq('firm_id', firmId)
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false }),
    supabase
      .from('usage_logs')
      .select('total_tokens, cost_usd, created_at')
      .eq('firm_id', firmId),
  ])

  const monthTokens = monthLogs?.reduce((s, r) => s + (r.total_tokens ?? 0), 0) ?? 0
  const monthCost = monthLogs?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0
  const allTokens = allLogs?.reduce((s, r) => s + (r.total_tokens ?? 0), 0) ?? 0
  const allCost = allLogs?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kullanım</h1>
        <p className="text-gray-500 mt-1">GPT-4o token kullanımı ve maliyet özeti</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Bu Ay Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthTokens.toLocaleString('tr-TR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              Bu Ay Maliyet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${monthCost.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              Toplam Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allTokens.toLocaleString('tr-TR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
              Bu Ay İşlem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthLogs?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bu ay log tablosu */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Bu Ay Detay</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Input Token</TableHead>
                <TableHead className="text-right">Output Token</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!monthLogs || monthLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    Bu ay henüz kullanım yok.
                  </TableCell>
                </TableRow>
              )}
              {monthLogs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{log.model}</TableCell>
                  <TableCell className="text-right text-sm">{(log.tokens_input ?? 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm">{(log.tokens_output ?? 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{(log.total_tokens ?? 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-700">
                    ${(log.cost_usd ?? 0).toFixed(5)}
                  </TableCell>
                </TableRow>
              ))}
              {monthLogs && monthLogs.length > 0 && (
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={2}>Toplam</TableCell>
                  <TableCell className="text-right text-sm">
                    {monthLogs.reduce((s, r) => s + (r.tokens_input ?? 0), 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {monthLogs.reduce((s, r) => s + (r.tokens_output ?? 0), 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{monthTokens.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm text-green-700">${monthCost.toFixed(4)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Genel özet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Tüm Zamanlar Toplam Maliyet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-900">${allCost.toFixed(4)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {(allLogs?.length ?? 0).toLocaleString('tr-TR')} AI işlemi · {allTokens.toLocaleString('tr-TR')} token
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
