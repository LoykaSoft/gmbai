'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Firm, BlacklistWord, InfoCard, GmbAccount } from '@/lib/types'
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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Link2Off,
  X,
  Plus,
  Save,
  Building2,
  Loader2,
} from 'lucide-react'

interface Props {
  firm: Firm
  blacklist: BlacklistWord[]
  successMsg?: string
  errorMsg?: string
  selectAccount?: boolean
}

export default function SettingsClient({
  firm,
  blacklist: initialBlacklist,
  successMsg,
  errorMsg,
  selectAccount,
}: Props) {
  const router = useRouter()

  // Info card state
  const ic = (firm.info_card ?? {}) as InfoCard
  const [address, setAddress] = useState(ic.address ?? '')
  const [hours, setHours] = useState(ic.hours ?? '')
  const [highlights, setHighlights] = useState(ic.highlights ?? '')
  const [faq, setFaq] = useState(ic.faq ?? '')
  const [forbiddenInfo, setForbiddenInfo] = useState(ic.forbidden_info ?? '')

  // Ton ayarları
  const [systemPrompt, setSystemPrompt] = useState(firm.system_prompt ?? '')
  const [responseLength, setResponseLength] = useState(firm.response_length)
  const [approvalMode, setApprovalMode] = useState(firm.approval_mode)

  // Kara liste
  const [blacklist, setBlacklist] = useState<BlacklistWord[]>(initialBlacklist)
  const [newWord, setNewWord] = useState('')

  const [saving, setSaving] = useState(false)
  const [savedSection, setSavedSection] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [blacklistLoading, setBlacklistLoading] = useState(false)

  // İşletme seçim modal state
  const [accountModalOpen, setAccountModalOpen] = useState(
    !!(selectAccount || firm.gmb_account_selection_pending)
  )
  const [accounts, setAccounts] = useState<GmbAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [selectingAccount, setSelectingAccount] = useState(false)

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true)
    setAccountsError(null)
    try {
      const res = await fetch('/api/auth/google/accounts')
      if (!res.ok) {
        setAccountsError('İşletme listesi alınamadı.')
        return
      }
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch {
      setAccountsError('İşletme listesi alınamadı.')
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (accountModalOpen) {
      loadAccounts()
    }
  }, [accountModalOpen, loadAccounts])

  async function handleSelectAccount(account: GmbAccount) {
    setSelectingAccount(true)
    try {
      const res = await fetch('/api/auth/google/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: account.name }),
      })
      if (!res.ok) {
        setAccountsError('Hesap seçimi kaydedilemedi.')
        return
      }
      setAccountModalOpen(false)
      router.refresh()
    } finally {
      setSelectingAccount(false)
    }
  }

  async function saveSettings(section: string, payload: Record<string, unknown>) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.error ?? 'Kaydetme başarısız oldu.')
        return
      }
      setSavedSection(section)
      setTimeout(() => setSavedSection(null), 2500)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveInfoCard() {
    await saveSettings('infoCard', {
      info_card: { address, hours, highlights, faq, forbidden_info: forbiddenInfo },
    })
  }

  async function handleSaveTone() {
    await saveSettings('tone', { system_prompt: systemPrompt, response_length: responseLength })
  }

  async function handleToggleApproval() {
    const original = approvalMode
    const next = !approvalMode
    setApprovalMode(next)
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_mode: next }),
      })
      if (!res.ok) {
        setApprovalMode(original)
        setSaveError('Onay modu değiştirilemedi.')
      } else {
        setSavedSection('approval')
        setTimeout(() => setSavedSection(null), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        setSaveError('Bağlantı kesilemedi, lütfen tekrar deneyin.')
        return
      }
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleAddWord() {
    const w = newWord.trim().toLowerCase()
    if (!w) return
    setBlacklistLoading(true)
    try {
      const res = await fetch('/api/settings/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w }),
      })
      if (!res.ok) return
      const created: BlacklistWord = await res.json()
      setBlacklist(prev => [created, ...prev])
      setNewWord('')
    } finally {
      setBlacklistLoading(false)
    }
  }

  async function handleRemoveWord(id: string) {
    const res = await fetch(`/api/settings/blacklist/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setBlacklist(prev => prev.filter(x => x.id !== id))
  }

  const gmb_connected = !!firm.gmb_access_token

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500 mt-1">Google bağlantısı, ton, bilgi kartı ve kara liste</p>
      </div>

      {/* İşletme Seçim Modalı */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Google İşletme Hesabı Seçin
            </DialogTitle>
            <DialogDescription>
              Google hesabınızda birden fazla işletme profili bulundu. Hangi işletmeyi bu hesaba bağlamak istediğinizi seçin.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {accountsLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">İşletmeler yükleniyor...</span>
              </div>
            )}

            {accountsError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {accountsError}
              </div>
            )}

            {!accountsLoading && !accountsError && accounts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                Google hesabınızda işletme profili bulunamadı.
              </p>
            )}

            {!accountsLoading && accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <button
                    key={account.name}
                    disabled={selectingAccount}
                    onClick={() => handleSelectAccount(account)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {account.accountName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{account.name}</p>
                    </div>
                    {selectingAccount && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAccountModalOpen(false)}
              >
                Daha sonra seç
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bildirimler */}
      {successMsg === 'google_connected' && (
        <div className="mb-6 flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Google hesabınız başarıyla bağlandı.
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg === 'google_oauth_denied' ? 'Google izni reddedildi.' :
           errorMsg === 'token_save_failed' ? 'Token kaydedilemedi, lütfen tekrar deneyin.' :
           'Bir hata oluştu: ' + errorMsg}
        </div>
      )}
      {saveError && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* Google Bağlantısı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google My Business Bağlantısı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gmb_connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Google hesabı bağlı</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  disabled={disconnecting}
                  onClick={handleDisconnect}
                >
                  <Link2Off className="w-3.5 h-3.5 mr-1.5" />
                  {disconnecting ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Google hesabı bağlı değil</span>
                </div>
                <a href="/api/auth/google">
                  <Button size="sm">
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                    Google Hesabımı Bağla
                  </Button>
                </a>
              </div>
            )}

            {/* Seçili işletme göster / değiştir */}
            {gmb_connected && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div>
                  {firm.gmb_location_id ? (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">Seçili işletme:</span>{' '}
                      {firm.gmb_location_id}
                    </p>
                  ) : firm.gmb_account_selection_pending ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      İşletme seçimi tamamlanmadı
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">İşletme seçilmedi</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setAccountModalOpen(true)}
                >
                  <Building2 className="w-3 h-3 mr-1" />
                  {firm.gmb_location_id ? 'İşletmeyi Değiştir' : 'İşletme Seç'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* İşletme Bilgi Kartı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">İşletme Bilgi Kartı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Bu bilgiler AI&apos;ın yorumlara cevap üretirken kullanacağı bağlam bilgilerdir.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Bağcılar Mah. Atatürk Cad. No:5, İstanbul"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hours">Çalışma Saatleri</Label>
                <Input
                  id="hours"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="Pazartesi-Cuma 09:00-22:00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="highlights">Öne Çıkan Ürünler / Hizmetler</Label>
              <Textarea
                id="highlights"
                value={highlights}
                onChange={e => setHighlights(e.target.value)}
                rows={2}
                placeholder="Ev yapımı lahmacun, kuzu tandır, taze mevsim salataları..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq">Sık Sorulan Sorular</Label>
              <Textarea
                id="faq"
                value={faq}
                onChange={e => setFaq(e.target.value)}
                rows={2}
                placeholder="Park yeri var mı? → Evet, 50 araçlık ücretsiz otoparkımız mevcut."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="forbidden_info">Kesinlikle Söylenmesin</Label>
              <Input
                id="forbidden_info"
                value={forbiddenInfo}
                onChange={e => setForbiddenInfo(e.target.value)}
                placeholder="Fiyatlar, personel maaşları, rakip markalar..."
              />
            </div>
            <div className="flex justify-end">
              <SaveButton
                onClick={handleSaveInfoCard}
                loading={saving}
                saved={savedSection === 'infoCard'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ton ve Yanıt Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ton ve Yanıt Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="systemPrompt">Marka Tonu (Özel Sistem Promptu)</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={3}
                placeholder="Samimi, sıcak ve misafirperver bir ton kullan. Müşteri adını cevaplarda kullan..."
              />
              <p className="text-xs text-gray-400">Boş bırakılırsa sistem varsayılanı kullanılır.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Yanıt Uzunluğu</Label>
              <Select value={responseLength} onValueChange={(v) => setResponseLength(v as typeof responseLength)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Kısa (1-2 cümle)</SelectItem>
                  <SelectItem value="medium">Orta (3-4 cümle)</SelectItem>
                  <SelectItem value="long">Uzun (detaylı)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <SaveButton
                onClick={handleSaveTone}
                loading={saving}
                saved={savedSection === 'tone'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Onay Modu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onay Modu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {approvalMode ? 'Onay Modu Açık' : 'Otomatik Yayın'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {approvalMode
                    ? 'AI cevapları yayınlanmadan önce sizin onayınızı bekler.'
                    : 'AI cevapları otomatik olarak Google\'a gönderilir. (1-2 yıldız her zaman onay bekler)'}
                </p>
              </div>
              <button
                onClick={handleToggleApproval}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  approvalMode ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    approvalMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {savedSection === 'approval' && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Kaydedildi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Kara Liste */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kara Liste Kelimeler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Bu kelimeler AI cevaplarında kesinlikle geçmez.
            </p>
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddWord()}
                placeholder="Kelime ekle..."
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddWord}
                disabled={blacklistLoading || !newWord.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ekle
              </Button>
            </div>
            {blacklist.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {blacklist.map(item => (
                  <span
                    key={item.id}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-2.5 py-1 rounded-full"
                  >
                    {item.word}
                    <button
                      onClick={() => handleRemoveWord(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Henüz kara liste kelimesi yok.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SaveButton({
  onClick,
  loading,
  saved,
}: {
  onClick: () => void
  loading: boolean
  saved: boolean
}) {
  return (
    <Button size="sm" onClick={onClick} disabled={loading}>
      {saved ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-400" />
          Kaydedildi
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </>
      )}
    </Button>
  )
}
