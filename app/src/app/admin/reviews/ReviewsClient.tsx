'use client'

import { useState, useMemo } from 'react'
import { Review, Firm, ReviewStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Star, Search } from 'lucide-react'

const STATUS_LABELS: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  auto_published: { label: 'Oto Yayın', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
}

interface ReviewWithFirm extends Review {
  firms: { name: string }
}

interface Props {
  reviews: ReviewWithFirm[]
  firms: Firm[]
}

export default function ReviewsClient({ reviews, firms }: Props) {
  const [search, setSearch] = useState('')
  const [firmFilter, setFirmFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      if (firmFilter !== 'all' && r.firm_id !== firmFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (ratingFilter !== 'all' && String(r.rating) !== ratingFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchText = r.review_text?.toLowerCase().includes(q)
        const matchName = r.reviewer_name.toLowerCase().includes(q)
        if (!matchText && !matchName) return false
      }
      return true
    })
  }, [reviews, firmFilter, statusFilter, ratingFilter, search])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tüm Yorumlar</h1>
        <p className="text-gray-500 mt-1">{filtered.length} / {reviews.length} yorum gösteriliyor</p>
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

        <Select value={firmFilter} onValueChange={v => v && setFirmFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tüm İşletmeler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İşletmeler</SelectItem>
            {firms.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İşletme</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Puan</TableHead>
              <TableHead>Yorum</TableHead>
              <TableHead>AI Cevabı</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-10">
                  Filtrelerle eşleşen yorum bulunamadı.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(review => {
              const s = STATUS_LABELS[review.status]
              return (
                <TableRow key={review.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {review.firms?.name ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{review.reviewer_name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {review.rating}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">{review.review_text ?? '—'}</p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-500 truncate">{review.ai_response ?? '—'}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                      {s.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(review.review_date).toLocaleDateString('tr-TR')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
