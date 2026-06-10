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
import { ArrowLeft, Wifi, WifiOff, Star, Save, UserPlus, Trash2 } from 'lucide-react'

interface FirmUser {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

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
  users: FirmUser[]
}

export default function FirmDetailClient({ firm, reviews, totalTokens, totalCost, users: initialUsers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [users, setUsers] = useState<FirmUser[]>(initialUsers)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState('')
  const [name, setName] = useState(firm.name)
  const [sector, setSector] = useState(firm.sector)
  const [approvalMode, setApprovalMode] = useState(firm.approval_mode)
  const [responseLength, setResponseLength] = useState<ResponseLength>(firm.response_length)
  const [systemPrompt, setSystemPrompt] = useState(firm.system_prompt ?? '')
  const [isActive, setIsActive] = useState(firm.is_active)

  async function handleCreateUser() {
    if (!newEmail || !newPassword) return
    setCreatingUser(true)
    setUserError('')
    try {
      const res = await fetch(`/api/admin/firms/${firm.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, full_name: newFullName }),
      })
      const data = await res.json()
      if (!res.ok) { setUserError(data.error ?? 'Hata'); return }
      setUsers(prev => [...prev, { id: data.id, full_name: newFullName || newEmail, role: 'firm_user', created_at: new Date().toISOString() }])
      setNewEmail(''); setNewPassword(''); setNewFullName('')
    } catch {
      setUserError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return
    setUserError('')
    try {
      const res = await fetch(`/api/admin/firms/${firm.id}/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUserError(data.error ?? 'Kullanıcı silinemedi.')
        return
      }
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch {
      setUserError('Bağlantı hatası, lütfen tekrar deneyin.')
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error ?? 'Kaydetme başarısız oldu.')
        return
      }
      router.refresh()
    } catch {
      setSaveError('Bağlantı hatası, lütfen tekrar deneyin.')
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

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{saveError}</p>
            )}

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

      {/* Users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Kullanıcılar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-6">
                    Bu işletmeye ait kullanıcı yok.
                  </TableCell>
                </TableRow>
              )}
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{u.role}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Yeni Kullanıcı Ekle</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ad Soyad</Label>
                <Input placeholder="Ali Veli" value={newFullName} onChange={e => setNewFullName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input placeholder="ali@firma.com" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Şifre</Label>
                <Input placeholder="••••••••" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            {userError && <p className="text-sm text-red-500">{userError}</p>}
            <Button onClick={handleCreateUser} disabled={creatingUser || !newEmail || !newPassword} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              {creatingUser ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
