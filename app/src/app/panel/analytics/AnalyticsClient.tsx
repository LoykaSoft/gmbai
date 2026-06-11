'use client'

import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Star, TrendingUp, MessageSquare, CheckCircle } from 'lucide-react'

interface ReviewRow {
  id: string
  rating: number
  status: string
  review_date: string
  created_at: string
}

export interface AnalysisRow {
  sentiment: string
  topics: string[]
  keywords: string[]
  has_critical_keyword: boolean
  critical_keywords: string[]
  review_id: string
  reviews: {
    reviewer_name: string
    rating: number
    review_text: string | null
    review_date: string
  } | null
}

interface Props {
  reviews: ReviewRow[]
  analysis: AnalysisRow[]
}

const SENTIMENT_COLORS = { positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' }
const TOPIC_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4']

export default function AnalyticsClient({ reviews, analysis }: Props) {
  const [trendPeriod, setTrendPeriod] = useState<'weekly' | 'monthly'>('monthly')

  // --- Temel istatistikler ---
  const total = reviews.length
  const published = reviews.filter(r => ['published', 'auto_published'].includes(r.status)).length
  const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
  const responseRate = total > 0 ? Math.round((published / total) * 100) : 0

  // --- Yıldız dağılımı ---
  const starDist = [5, 4, 3, 2, 1].map(star => ({
    star: `${star}★`,
    count: reviews.filter(r => r.rating === star).length,
  }))

  // --- Duygu dağılımı ---
  const sentimentCounts = useMemo(() => {
    const c = { positive: 0, negative: 0, neutral: 0 }
    for (const a of analysis) {
      if (a.sentiment in c) c[a.sentiment as keyof typeof c]++
    }
    return [
      { name: 'Olumlu', value: c.positive, color: SENTIMENT_COLORS.positive },
      { name: 'Olumsuz', value: c.negative, color: SENTIMENT_COLORS.negative },
      { name: 'Nötr', value: c.neutral, color: SENTIMENT_COLORS.neutral },
    ].filter(s => s.value > 0)
  }, [analysis])

  // --- Konu dağılımı ---
  const topicCounts = useMemo(() => {
    const c = new Map<string, number>()
    for (const a of analysis) {
      for (const t of (a.topics ?? [])) {
        c.set(t, (c.get(t) ?? 0) + 1)
      }
    }
    return Array.from(c.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([topic, count]) => ({ topic, count }))
  }, [analysis])

  // --- Kelime bulutu (büyüklük ağırlıklı) ---
  const keywords = useMemo(() => {
    const c = new Map<string, number>()
    for (const a of analysis) {
      for (const k of (a.keywords ?? [])) {
        const w = k.toLowerCase().trim()
        if (w.length > 2) c.set(w, (c.get(w) ?? 0) + 1)
      }
    }
    const max = Math.max(...c.values(), 1)
    return Array.from(c.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 35)
      .map(([word, count]) => ({ word, count, size: Math.round(12 + (count / max) * 20) }))
  }, [analysis])

  // --- Puan trendi ---
  const trend = useMemo(() => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    // Sıralama her zaman sayısal anahtar üzerinden yapılır (ay adları alfabetik sıralanamaz)
    const buckets = new Map<string, { label: string; total: number; count: number }>()
    for (const r of reviews) {
      const d = new Date(r.review_date)
      if (isNaN(d.getTime())) continue
      let key: string
      let label: string
      if (trendPeriod === 'weekly') {
        // ISO hafta numarası
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        const day = date.getUTCDay() || 7
        date.setUTCDate(date.getUTCDate() + 4 - day)
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
        key = `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`
        label = `${date.getUTCFullYear()} H${week}`
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        label = `${months[d.getMonth()]} ${d.getFullYear()}`
      }
      const b = buckets.get(key) ?? { label, total: 0, count: 0 }
      b.total += r.rating
      b.count += 1
      buckets.set(key, b)
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, b]) => ({
        period: b.label,
        'Ort. Puan': Math.round((b.total / b.count) * 10) / 10,
        'Yorum Sayısı': b.count,
      }))
  }, [reviews, trendPeriod])

  // --- Kritik kelime alarmları ---
  const criticalReviews = useMemo(
    () => analysis.filter(a => a.has_critical_keyword && a.reviews),
    [analysis]
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analitik</h1>
        <p className="text-gray-500 mt-1">Son 12 ay — {total} yorum</p>
      </div>

      {/* Kritik kelime alarmı */}
      {criticalReviews.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-semibold text-red-700">
              {criticalReviews.length} kritik anahtar kelimeli yorum tespit edildi
            </p>
          </div>
          <div className="space-y-2">
            {criticalReviews.slice(0, 3).map(a => (
              <div key={a.review_id} className="bg-white rounded-lg px-3 py-2 border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">{a.reviews?.reviewer_name}</span>
                  <span className="text-xs text-gray-400">
                    {a.reviews?.review_date ? new Date(a.reviews.review_date).toLocaleDateString('tr-TR') : ''}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                    {a.critical_keywords?.join(', ')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-1">{a.reviews?.review_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Yorum', value: total, icon: MessageSquare, color: 'text-blue-600' },
          { label: 'Ort. Puan', value: avgRating.toFixed(1), icon: Star, color: 'text-yellow-500' },
          { label: 'Cevaplanma', value: `%${responseRate}`, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Analiz Edilen', value: analysis.length, icon: TrendingUp, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Puan trendi */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Puan Trendi</CardTitle>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['monthly', 'weekly'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`px-3 py-1.5 transition-colors ${trendPeriod === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {p === 'monthly' ? 'Aylık' : 'Haftalık'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="rating" domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="rating" type="monotone" dataKey="Ort. Puan" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line yAxisId="count" type="monotone" dataKey="Yorum Sayısı" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Yıldız dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Yıldız Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {starDist.every(s => s.count === 0) ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={starDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="star" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Yorum" radius={[4, 4, 0, 0]}>
                    {starDist.map((entry, i) => (
                      <Cell key={i} fill={entry.star.startsWith('5') || entry.star.startsWith('4') ? '#22c55e' : entry.star.startsWith('3') ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Duygu dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Duygu Analizi</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentCounts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={sentimentCounts} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                      {sentimentCounts.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} yorum`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {sentimentCounts.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-sm text-gray-700">{s.name}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Konu dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Konu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {topicCounts.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topicCounts} layout="vertical" margin={{ top: 4, right: 16, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="topic" tick={{ fontSize: 12 }} width={65} />
                  <Tooltip />
                  <Bar dataKey="count" name="Yorum" radius={[0, 4, 4, 0]}>
                    {topicCounts.map((_, i) => (
                      <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Kelime bulutu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Öne Çıkan Kelimeler</CardTitle>
          </CardHeader>
          <CardContent>
            {keywords.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-wrap gap-2 p-2 min-h-[180px] content-start">
                {keywords.map(({ word, count, size }) => (
                  <span
                    key={word}
                    title={`${count} kez`}
                    style={{ fontSize: size }}
                    className="text-gray-700 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 px-2 py-0.5 rounded-full cursor-default transition-colors"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      Henüz yeterli veri yok.
    </div>
  )
}
