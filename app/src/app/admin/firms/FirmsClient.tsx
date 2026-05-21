'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Firm, Sector, ResponseLength } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, Trash2, ExternalLink, Wifi, WifiOff } from 'lucide-react'

const SECTOR_LABELS: Record<Sector, string> = {
  restoran: 'Restoran',
  kafe: 'Kafe',
  bar: 'Bar',
  diger: 'Diğer',
}

interface FirmForm {
  name: string
  sector: Sector
  approval_mode: boolean
  response_length: ResponseLength
}

const defaultForm: FirmForm = {
  name: '',
  sector: 'restoran',
  approval_mode: true,
  response_length: 'medium',
}

export default function FirmsClient({ initialFirms }: { initialFirms: Firm[] }) {
  const router = useRouter()
  const [firms, setFirms] = useState<Firm[]>(initialFirms)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null)
  const [form, setForm] = useState<FirmForm>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function openCreate() {
    setEditingFirm(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(firm: Firm) {
    setEditingFirm(firm)
    setForm({
      name: firm.name,
      sector: firm.sector,
      approval_mode: firm.approval_mode,
      response_length: firm.response_length,
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingFirm) {
        const res = await fetch(`/api/admin/firms/${editingFirm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const updated: Firm = await res.json()
        setFirms(prev => prev.map(f => (f.id === updated.id ? updated : f)))
      } else {
        const res = await fetch('/api/admin/firms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const created: Firm = await res.json()
        setFirms(prev => [created, ...prev])
      }
      setDialogOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await fetch(`/api/admin/firms/${id}`, { method: 'DELETE' })
      setFirms(prev => prev.filter(f => f.id !== id))
      setDeleteConfirm(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function toggleApproval(firm: Firm) {
    const res = await fetch(`/api/admin/firms/${firm.id}/approval-mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_mode: !firm.approval_mode }),
    })
    const updated: Firm = await res.json()
    setFirms(prev => prev.map(f => (f.id === updated.id ? updated : f)))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İşletmeler</h1>
          <p className="text-gray-500 mt-1">{firms.length} işletme kayıtlı</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni İşletme
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İşletme Adı</TableHead>
              <TableHead>Sektör</TableHead>
              <TableHead>GMB</TableHead>
              <TableHead>Onay Modu</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {firms.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-10">
                  Henüz işletme yok. Yeni işletme ekleyin.
                </TableCell>
              </TableRow>
            )}
            {firms.map(firm => (
              <TableRow key={firm.id}>
                <TableCell className="font-medium">{firm.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{SECTOR_LABELS[firm.sector]}</Badge>
                </TableCell>
                <TableCell>
                  {firm.gmb_access_token ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <Wifi className="w-3.5 h-3.5" /> Bağlı
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <WifiOff className="w-3.5 h-3.5" /> Bağlı Değil
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleApproval(firm)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      firm.approval_mode
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {firm.approval_mode ? 'Onay Açık' : 'Otomatik'}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={firm.is_active ? 'default' : 'secondary'}>
                    {firm.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/firms/${firm.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(firm)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setDeleteConfirm(firm.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFirm ? 'İşletmeyi Düzenle' : 'Yeni İşletme'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">İşletme Adı</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Örn: Cafe Deniz"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sektör</Label>
              <Select
                value={form.sector}
                onValueChange={v => setForm(f => ({ ...f, sector: v as Sector }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restoran">Restoran</SelectItem>
                  <SelectItem value="kafe">Kafe</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cevap Uzunluğu</Label>
              <Select
                value={form.response_length}
                onValueChange={v => setForm(f => ({ ...f, response_length: v as ResponseLength }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Kısa (1-2 cümle)</SelectItem>
                  <SelectItem value="medium">Orta (3-4 cümle)</SelectItem>
                  <SelectItem value="long">Uzun (detaylı)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="approval_mode"
                checked={form.approval_mode}
                onChange={e => setForm(f => ({ ...f, approval_mode: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="approval_mode">Onay Modu Açık</Label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Kaydediliyor...' : editingFirm ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşletmeyi Sil</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm mt-2">
            Bu işletmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              {loading ? 'Siliniyor...' : 'Evet, Sil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
