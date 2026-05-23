'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Review } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Check, X, Pencil, ChevronDown, ChevronUp, Clock } from 'lucide-react'

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

export default function PendingClient({ initialReviews }: { initialReviews: Review[] }) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setLoading(id)
    try {
      const res = await fetch(`/api/reviews/${id}/approve`, { method: 'PUT' })
      if (!res.ok) return
      setReviews(prev => prev.filter(r => r.id !== id))
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
      setReviews(prev => prev.filter(r => r.id !== id))
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleEditSave(review: Review) {
    const text = editTexts[review.id]
    if (!text?.trim()) return
    setLoading(review.id)
    try {
      const res = await fetch(`/api/reviews/${review.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: text }),
      })
      if (!res.ok) return
      setReviews(prev => prev.filter(r => r.id !== review.id))
      setEditingId(null)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  function startEdit(review: Review) {
    setEditTexts(prev => ({
      ...prev,
      [review.id]: review.edited_response ?? review.ai_response ?? '',
    }))
    setEditingId(review.id)
    setExpandedId(review.id)
  }

  if (reviews.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bekleyen Onaylar</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Harika! Bekleyen yorum yok</h2>
          <p className="text-gray-500 text-sm mt-1">Tüm yorumlar işlendi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bekleyen Onaylar</h1>
        <p className="text-gray-500 mt-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-yellow-500" />
            {reviews.length} yorum onayınızı bekliyor
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {reviews.map(review => {
          const expanded = expandedId === review.id
          const isEditing = editingId === review.id
          const isLoading = loading === review.id
          const isCritical = review.rating <= 2

          return (
            <Card
              key={review.id}
              className={`${isCritical ? 'border-red-200 bg-red-50/30' : 'border-yellow-200'}`}
            >
              <CardContent className="pt-4 pb-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{review.reviewer_name}</span>
                      <StarRow rating={review.rating} />
                      {isCritical && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          Düşük Puan — Zorunlu Onay
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(review.review_date).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{review.review_text}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expanded ? null : review.id)}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Expanded */}
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {review.review_text && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Müşteri Yorumu</p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2">
                          {review.review_text}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">AI Taslak Cevabı</p>
                      {isEditing ? (
                        <Textarea
                          value={editTexts[review.id] ?? ''}
                          onChange={e =>
                            setEditTexts(prev => ({ ...prev, [review.id]: e.target.value }))
                          }
                          rows={5}
                          className="bg-white"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg border border-blue-100 px-3 py-2">
                          {review.edited_response ?? review.ai_response ?? (
                            <span className="italic text-gray-400">Henüz AI cevabı üretilmedi</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(review)}
                            disabled={isLoading}
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            {isLoading ? 'Kaydediliyor...' : 'Düzenle & Yayınla'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            disabled={isLoading}
                          >
                            İptal
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isLoading}
                            onClick={() => handleApprove(review.id)}
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            {isLoading ? 'İşleniyor...' : 'Onayla & Yayınla'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            disabled={isLoading}
                            onClick={() => startEdit(review)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-300 hover:bg-red-50"
                            disabled={isLoading}
                            onClick={() => handleReject(review.id)}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Reddet
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Compact action row when collapsed */}
                {!expanded && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleApprove(review.id)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {isLoading ? '...' : 'Onayla'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => startEdit(review)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-300 hover:bg-red-50 h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleReject(review.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Reddet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
