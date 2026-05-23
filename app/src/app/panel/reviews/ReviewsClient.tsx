'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Review, ReviewStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Search, Check, X, Pencil, ChevronDown, ChevronUp, RefreshCw, Globe } from 'lucide-react'

const STATUS_LABELS: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  auto_published: { label: 'Oto Yayın', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </span>
  )
}

interface Props {
  initialReviews: Review[]
}

export default function ReviewsClient({ initialReviews }: Props) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  // Tekrar eden müşteri tespiti: aynı reviewer_id'den 2+ yorum varsa
  const repeatCustomers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of reviews) {
      if (r.reviewer_id) counts.set(r.reviewer_id, (counts.get(r.reviewer_id) ?? 0) + 1)
    }
    return counts
  }, [reviews])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<Review | null>(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (ratingFilter !== 'all' && String(r.rating) !== ratingFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!r.review_text?.toLowerCase().includes(q) && !r.reviewer_name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [reviews, statusFilter, ratingFilter, search])

  async function handleApprove(id: string) {
    setLoading(id)
    try {
      const res = await fetch(`/api/reviews/${id}/approve`, { method: 'PUT' })
      if (!res.ok) return
      const updated: Review = await res.json()
      setReviews(prev => prev.map(r => r.id === id ? updated : r))
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleReject(id: string) {
    setLoading(id)
    try {
      const res = await fetch(`/api/reviews/${id}/reject`, { method: 'PUT' })
      if (!res.ok) return
      const updated: Review = await res.json()
      setReviews(prev => prev.map(r => r.id === id ? updated : r))
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleEditSave() {
    if (!editDialog) return
    setLoading(editDialog.id)
    try {
      const res = await fetch(`/api/reviews/${editDialog.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: editText }),
      })
      if (!res.ok) return
      const updated: Review = await res.json()
      setReviews(prev => prev.map(r => r.id === editDialog.id ? updated : r))
      setEditDialog(null)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  function openEdit(review: Review) {
    setEditText(review.edited_response ?? review.ai_response ?? '')
    setEditDialog(review)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Yorumlarım</h1>
        <p className="text-gray-500 mt-1">{filtered.length} / {reviews.length} yorum</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Müşteri adı veya yorum ara..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tüm Durumlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="published">Yayında</SelectItem>
            <SelectItem value="auto_published">Oto Yayın</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={v => v && setRatingFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tüm Puanlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Puanlar</SelectItem>
            <SelectItem value="5">5 Yıldız</SelectItem>
            <SelectItem value="4">4 Yıldız</SelectItem>
            <SelectItem value="3">3 Yıldız</SelectItem>
            <SelectItem value="2">2 Yıldız</SelectItem>
            <SelectItem value="1">1 Yıldız</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            Filtrelerle eşleşen yorum bulunamadı.
          </div>
        )}
        {filtered.map(review => {
          const s = STATUS_LABELS[review.status]
          const expanded = expandedId === review.id
          const isPending = review.status === 'pending'
          const isLoading = loading === review.id

          return (
            <Card key={review.id} className={isPending ? 'border-yellow-200' : ''}>
              <CardContent className="pt-4 pb-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{review.reviewer_name}</span>
                      <StarRow rating={review.rating} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.review_date).toLocaleDateString('tr-TR')}
                      </span>
                      {review.reviewer_id && (repeatCustomers.get(review.reviewer_id) ?? 0) > 1 && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          <RefreshCw className="w-3 h-3" />
                          Tekrar Müşteri
                        </span>
                      )}
                      {review.review_language && review.review_language !== 'tr' && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium uppercase">
                          <Globe className="w-3 h-3" />
                          {review.review_language}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
                      {review.review_text ?? <span className="italic text-gray-400">Yorum metni yok</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          disabled={isLoading}
                          onClick={() => handleApprove(review.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          disabled={isLoading}
                          onClick={() => openEdit(review)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-300 hover:bg-red-50"
                          disabled={isLoading}
                          onClick={() => handleReject(review.id)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Reddet
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expanded ? null : review.id)}
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded: AI cevabı */}
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {review.review_text && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Müşteri Yorumu</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                          {review.review_text}
                        </p>
                      </div>
                    )}
                    {(review.ai_response || review.edited_response || review.final_response) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {review.final_response ? 'Yayınlanan Cevap' : 'AI Cevabı (Taslak)'}
                        </p>
                        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg px-3 py-2">
                          {review.final_response ?? review.edited_response ?? review.ai_response}
                        </p>
                      </div>
                    )}
                    {review.cost_usd && (
                      <p className="text-xs text-gray-400">
                        Token: {((review.tokens_input ?? 0) + (review.tokens_output ?? 0)).toLocaleString('tr-TR')} · Maliyet: ${review.cost_usd.toFixed(5)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={open => !open && setEditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Cevabını Düzenle</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Müşteri Yorumu</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  {editDialog.review_text ?? <span className="italic text-gray-400">Yorum metni yok</span>}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">Cevap</p>
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={6}
                  placeholder="Cevabı düzenleyin..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditDialog(null)}>İptal</Button>
                <Button
                  onClick={handleEditSave}
                  disabled={loading === editDialog.id || !editText.trim()}
                >
                  {loading === editDialog.id ? 'Kaydediliyor...' : 'Düzenle & Yayınla'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
