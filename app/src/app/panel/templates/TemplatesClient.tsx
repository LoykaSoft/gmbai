'use client'

import { useState } from 'react'
import { Template } from '@/lib/types'
import { getSectorTopics, getTopicLabel } from '@/lib/sectors-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, FlaskConical, Star } from 'lucide-react'

const RATING_LABELS: Record<string, string> = {
  '1-2': '1-2 Yıldız',
  '3-4': '3-4 Yıldız',
  '5': '5 Yıldız',
}


type RatingRange = '1-2' | '3-4' | '5'

interface TestState {
  templateId: string
  reviewText: string
  rating: number
  response: string | null
  loading: boolean
}

const EMPTY_FORM = {
  name: '',
  rating_range: '5' as RatingRange,
  topic: 'genel',
  opening: '',
  body: '',
  closing: '',
}

interface Props {
  initialTemplates: Template[]
  firmSector: string
}

export default function TemplatesClient({ initialTemplates, firmSector }: Props) {
  const topicOptions = getSectorTopics(firmSector)
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Template | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [listError, setListError] = useState('')
  const [test, setTest] = useState<TestState | null>(null)

  const systemTemplates = templates.filter(t => t.is_system)
  const customTemplates = templates.filter(t => !t.is_system)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setSaveError('')
    setDialog('create')
  }

  function openEdit(t: Template) {
    setForm({
      name: t.name,
      rating_range: t.rating_range,
      topic: t.topic,
      opening: t.opening,
      body: t.body,
      closing: t.closing,
    })
    setEditTarget(t)
    setSaveError('')
    setDialog('edit')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      if (dialog === 'create') {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setSaveError(body.error ?? 'Şablon kaydedilemedi.')
          return
        }
        const created: Template = await res.json()
        setTemplates(prev => [created, ...prev])
      } else if (dialog === 'edit' && editTarget) {
        const res = await fetch(`/api/templates/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setSaveError(body.error ?? 'Şablon kaydedilemedi.')
          return
        }
        const updated: Template = await res.json()
        setTemplates(prev => prev.map(t => t.id === editTarget.id ? updated : t))
      }
      setDialog(null)
    } catch {
      setSaveError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setListError('')
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setListError(body.error ?? 'Şablon silinemedi.')
        return
      }
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch {
      setListError('Bağlantı hatası, lütfen tekrar deneyin.')
    }
  }

  function openTest(t: Template) {
    setTest({
      templateId: t.id,
      reviewText: '',
      rating: 5,
      response: null,
      loading: false,
    })
  }

  async function runTest() {
    if (!test) return
    const current = test
    setTest(prev => prev ? { ...prev, loading: true, response: null } : null)
    try {
      const res = await fetch(`/api/templates/${current.templateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: current.reviewText, rating: current.rating }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setTest(prev => prev ? { ...prev, loading: false, response: body.error ?? 'Test başarısız oldu.' } : null)
        return
      }
      const data = await res.json()
      setTest(prev => prev ? { ...prev, loading: false, response: data.response ?? data.error } : null)
    } catch {
      setTest(prev => prev ? { ...prev, loading: false, response: 'Bağlantı hatası, lütfen tekrar deneyin.' } : null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Şablonlar</h1>
          <p className="text-gray-500 mt-1">Hazır sistem şablonları ve özel şablonlarınız</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Yeni Şablon
        </Button>
      </div>

      {listError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">{listError}</p>
      )}

      {/* Özel Şablonlar */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Özel Şablonlarım ({customTemplates.length})</h2>
        {customTemplates.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl text-center py-12 text-gray-400 text-sm">
            Henüz özel şablon yok. Yeni Şablon butonuyla ekleyebilirsiniz.
          </div>
        ) : (
          <div className="grid gap-3">
            {customTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={() => openEdit(t)}
                onDelete={() => handleDelete(t.id)}
                onTest={() => openTest(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sistem Şablonları */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Sistem Şablonları ({systemTemplates.length})</h2>
        <div className="grid gap-3">
          {systemTemplates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onTest={() => openTest(t)}
              readOnly
            />
          ))}
          {systemTemplates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Sistem şablonları Supabase&apos;den yüklenecek.
            </p>
          )}
        </div>
      </section>

      {/* Oluştur / Düzenle Dialog */}
      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialog === 'create' ? 'Yeni Şablon' : 'Şablonu Düzenle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Şablon Adı</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="5 Yıldız Genel Teşekkür"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Yıldız Aralığı</Label>
                <Select
                  value={form.rating_range}
                  onValueChange={v => setForm(p => ({ ...p, rating_range: v as RatingRange }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Yıldız</SelectItem>
                    <SelectItem value="3-4">3-4 Yıldız</SelectItem>
                    <SelectItem value="1-2">1-2 Yıldız</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Konu</Label>
                <Select
                  value={form.topic}
                  onValueChange={v => v && setForm(p => ({ ...p, topic: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {topicOptions.map(t => (
                      <SelectItem key={t} value={t}>{getTopicLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Açılış</Label>
              <Input
                value={form.opening}
                onChange={e => setForm(p => ({ ...p, opening: e.target.value }))}
                placeholder="Değerli müşterimiz, güzel yorumunuz için teşekkür ederiz!"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gövde Yönlendirmesi</Label>
              <Textarea
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                rows={2}
                placeholder="Deneyiminizi özelleştiren unsurlardan bahset, olumlu detayları vurgula."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kapanış</Label>
              <Input
                value={form.closing}
                onChange={e => setForm(p => ({ ...p, closing: e.target.value }))}
                placeholder="Sizi tekrar ağırlamayı dört gözle bekliyoruz."
              />
            </div>
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{saveError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>İptal</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={!!test} onOpenChange={open => !open && setTest(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Şablonu Test Et</DialogTitle>
          </DialogHeader>
          {test && (
            <div className="space-y-4 mt-2">
              <p className="text-xs text-gray-500">
                Gerçek bir yorum girin ve AI&apos;ın bu şablonla nasıl cevap ürettiğini görün. Yayınlama yapılmaz.
              </p>
              <div className="space-y-1.5">
                <Label>Yıldız Sayısı</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setTest(prev => prev ? { ...prev, rating: n } : null)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${n <= test.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Müşteri Yorumu</Label>
                <Textarea
                  value={test.reviewText}
                  onChange={e => setTest(prev => prev ? { ...prev, reviewText: e.target.value } : null)}
                  rows={3}
                  placeholder="Test için bir müşteri yorumu girin..."
                />
              </div>
              <Button
                onClick={runTest}
                disabled={test.loading || !test.reviewText.trim()}
                className="w-full"
              >
                {test.loading ? 'AI üretiyor...' : 'AI Cevabı Oluştur'}
              </Button>
              {test.response && (
                <div className="space-y-1.5">
                  <Label>AI Cevabı (Önizleme)</Label>
                  <div className="bg-blue-50 rounded-lg px-3 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {test.response}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onTest,
  readOnly = false,
}: {
  template: Template
  onEdit?: () => void
  onDelete?: () => void
  onTest: () => void
  readOnly?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-gray-900">{template.name}</CardTitle>
            {template.is_system && (
              <Badge variant="secondary" className="text-xs">Sistem</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {RATING_LABELS[template.rating_range] ?? template.rating_range}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {template.topic}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-500 line-clamp-2">
          {[template.opening, template.body, template.closing].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={onTest} className="text-xs h-7">
            <FlaskConical className="w-3 h-3 mr-1" />
            Test Et
          </Button>
          {!readOnly && (
            <>
              <Button size="sm" variant="ghost" onClick={onEdit} className="text-xs h-7">
                <Pencil className="w-3 h-3 mr-1" />
                Düzenle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Sil
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
