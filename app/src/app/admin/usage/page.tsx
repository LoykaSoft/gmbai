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
import { Zap, DollarSign, TrendingUp } from 'lucide-react'

interface FirmUsage {
  firm_id: string
  firm_name: string
  total_tokens: number
  tokens_input: number
  tokens_output: number
  cost_usd: number
  review_count: number
}

export default async function AdminUsagePage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: allUsage }, { data: monthUsage }, { data: firms }] = await Promise.all([
    supabase.from('usage_logs').select('firm_id, total_tokens, tokens_input, tokens_output, cost_usd'),
    supabase
      .from('usage_logs')
      .select('firm_id, total_tokens, tokens_input, tokens_output, cost_usd')
      .gte('created_at', monthStart),
    supabase.from('firms').select('id, name'),
  ])

  const firmMap = Object.fromEntries((firms ?? []).map(f => [f.id, f.name]))

  function aggregate(logs: typeof allUsage): FirmUsage[] {
    const map: Record<string, FirmUsage> = {}
    for (const log of logs ?? []) {
      if (!map[log.firm_id]) {
        map[log.firm_id] = {
          firm_id: log.firm_id,
          firm_name: firmMap[log.firm_id] ?? 'Bilinmiyor',
          total_tokens: 0,
          tokens_input: 0,
          tokens_output: 0,
          cost_usd: 0,
          review_count: 0,
        }
      }
      map[log.firm_id].total_tokens += log.total_tokens ?? 0
      map[log.firm_id].tokens_input += log.tokens_input ?? 0
      map[log.firm_id].tokens_output += log.tokens_output ?? 0
      map[log.firm_id].cost_usd += log.cost_usd ?? 0
      map[log.firm_id].review_count += 1
    }
    return Object.values(map).sort((a, b) => b.cost_usd - a.cost_usd)
  }

  const allStats = aggregate(allUsage)
  const monthStats = aggregate(monthUsage)

  const totalTokensAll = allStats.reduce((s, r) => s + r.total_tokens, 0)
  const totalCostAll = allStats.reduce((s, r) => s + r.cost_usd, 0)
  const totalTokensMonth = monthStats.reduce((s, r) => s + r.total_tokens, 0)
  const totalCostMonth = monthStats.reduce((s, r) => s + r.cost_usd, 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Token Kullanımı</h1>
        <p className="text-gray-500 mt-1">GPT-4o kullanım ve maliyet özeti</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Bu Ay Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTokensMonth.toLocaleString('tr-TR')}</p>
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
            <p className="text-2xl font-bold">${totalCostMonth.toFixed(4)}</p>
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
            <p className="text-2xl font-bold">{totalTokensAll.toLocaleString('tr-TR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-purple-500" />
              Toplam Maliyet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCostAll.toFixed(4)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bu ay tablosu */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Bu Ay — İşletme Bazlı
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İşletme</TableHead>
                <TableHead className="text-right">İşlenen Yorum</TableHead>
                <TableHead className="text-right">Input Token</TableHead>
                <TableHead className="text-right">Output Token</TableHead>
                <TableHead className="text-right">Toplam Token</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    Bu ay henüz kullanım yok.
                  </TableCell>
                </TableRow>
              )}
              {monthStats.map(row => (
                <TableRow key={row.firm_id}>
                  <TableCell className="font-medium">{row.firm_name}</TableCell>
                  <TableCell className="text-right text-sm">{row.review_count}</TableCell>
                  <TableCell className="text-right text-sm">{row.tokens_input.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm">{row.tokens_output.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{row.total_tokens.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-700">
                    ${row.cost_usd.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
              {monthStats.length > 0 && (
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>Toplam</TableCell>
                  <TableCell className="text-right text-sm">
                    {monthStats.reduce((s, r) => s + r.review_count, 0)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {monthStats.reduce((s, r) => s + r.tokens_input, 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {monthStats.reduce((s, r) => s + r.tokens_output, 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {totalTokensMonth.toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    ${totalCostMonth.toFixed(4)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tüm zamanlar tablosu */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Tüm Zamanlar — İşletme Bazlı
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İşletme</TableHead>
                <TableHead className="text-right">İşlenen Yorum</TableHead>
                <TableHead className="text-right">Input Token</TableHead>
                <TableHead className="text-right">Output Token</TableHead>
                <TableHead className="text-right">Toplam Token</TableHead>
                <TableHead className="text-right">Toplam Maliyet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    Henüz kullanım kaydı yok.
                  </TableCell>
                </TableRow>
              )}
              {allStats.map(row => (
                <TableRow key={row.firm_id}>
                  <TableCell className="font-medium">{row.firm_name}</TableCell>
                  <TableCell className="text-right text-sm">{row.review_count}</TableCell>
                  <TableCell className="text-right text-sm">{row.tokens_input.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm">{row.tokens_output.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{row.total_tokens.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-700">
                    ${row.cost_usd.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
              {allStats.length > 0 && (
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>Toplam</TableCell>
                  <TableCell className="text-right text-sm">
                    {allStats.reduce((s, r) => s + r.review_count, 0)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {allStats.reduce((s, r) => s + r.tokens_input, 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {allStats.reduce((s, r) => s + r.tokens_output, 0).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {totalTokensAll.toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    ${totalCostAll.toFixed(4)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
