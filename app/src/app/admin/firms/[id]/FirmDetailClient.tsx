'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Firm, Review, ReviewStatus, ResponseLength } from '@/lib/types'
import { SECTORS } from '@/lib/sectors-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Wifi, WifiOff, Star, Save } from 'lucide-react'

const STATUS_LABELS: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  auto_published: { label: 'Oto Yayın', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
}

interface Props {
  firm: Firm
  reviews: Review[]
  totalTokens: number
  totalCost: number
}

export default function FirmDetailClient({ firm, reviews, totalTokens, totalCost }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(firm.name)
  const [sector, setSector] = useState(firm.sector)
  const [approvalMode, setApprovalMode] = useState(firm.approval_mode)
  const [responseLength, setResponseLength] = useState<ResponseLength>(firm.response_length)
  const [systemPrompt, setSystemPrompt] = useState(firm.system_prompt ?? '')
  const [isActive, setIsActive] = useState(firm.is_active)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/firms/${firm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sector,
          approval_mode: approvalMode,
          response_length: responseLength,
          system_prompt: systemPrompt,
          is_active: isActive,
        }),
      })
      if (!res.ok) return
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Geri
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{firm.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">İşletme Detayı</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 font-medium">Toplam Yorum</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 font-medium">Toplam Token</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString('tr-TR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-500 font-medium">Toplam Maliyet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ayarlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>İşletme Adı</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Sektör</Label>
              <Select value={sector} onValueChange={v => v && setSector(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cevap Uzunluğu</Label>
              <Select value={responseLength} onValueChange={v => setResponseLength(v as ResponseLength)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Kısa</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="long">Uzun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Onay Modu</p>
                <p className="text-xs text-gray-500">AI cevapları işletme onayı beklesin</p>
              </div>
              <button
                onClick={() => setApprovalMode(!approvalMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  approvalMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    approvalMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Aktif</p>
                <p className="text-xs text-gray-500">İşletme sisteme dahil edilsin</p>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bağlantı & Sistem Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              {firm.gmb_access_token ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">GMB Bağlı</p>
                    <p className="text-xs text-gray-500">Google My Business hesabı aktif</p>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">GMB Bağlı Değil</p>
                    <p className="text-xs text-gray-500">İşletme panelinden bağlanabilir</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Sistem Prompt (Ton Tanımı)</Label>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="İşletmenin özel ton ve kişilik tanımı..."
                rows={6}
              />
              <p className="text-xs text-gray-400">
                Boş bırakılırsa varsayılan sistem prompt kullanılır.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Promptu Kaydet'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son Yorumlar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>Puan</TableHead>
                <TableHead>Yorum</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    Bu işletmeye ait yorum yok.
                  </TableCell>
                </TableRow>
              )}
              {reviews.slice(0, 20).map(review => {
                const s = STATUS_LABELS[review.status] ?? { label: review.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <TableRow key={review.id}>
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
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(review.review_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
