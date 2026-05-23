'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  BarChart3,
  FileText,
  Settings,
  Zap,
  LogOut,
  Bell,
  AlertTriangle,
  X,
  CheckCheck,
} from 'lucide-react'

const navItems = [
  { href: '/panel', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/panel/reviews', label: 'Yorumlarım', icon: MessageSquare },
  { href: '/panel/reviews/pending', label: 'Bekleyen Onaylar', icon: Clock },
  { href: '/panel/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/panel/templates', label: 'Şablonlar', icon: FileText },
  { href: '/panel/usage', label: 'Kullanım', icon: Zap },
  { href: '/panel/settings', label: 'Ayarlar', icon: Settings },
]

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
  review_id: string | null
}

export default function PanelSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    fetchNotifications()
    // Her 2 dakikada bir yenile
    const interval = setInterval(fetchNotifications, 120_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // sessizce geç
    }
  }

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
    if (res.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const res = await fetch('/api/notifications/read-all', { method: 'PUT' })
    if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">GMB AI</h1>
          <p className="text-xs text-gray-400 mt-0.5">İşletme Paneli</p>
        </div>

        {/* Bildirim zili */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Bildirim paneli */}
          {open && (
            <div className="absolute left-full top-0 ml-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Bildirimler</span>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Tümünü okundu işaretle
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 text-gray-300 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Bildirim yok</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 border-b border-gray-50 last:border-0 transition-colors',
                        !n.is_read ? 'bg-orange-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', !n.is_read ? 'text-orange-500' : 'text-gray-300')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="shrink-0 w-2 h-2 bg-orange-400 rounded-full mt-1.5"
                            title="Okundu işaretle"
                          />
                        )}
                      </div>
                      {n.review_id && (
                        <Link
                          href="/panel/reviews/pending"
                          onClick={() => { markRead(n.id); setOpen(false) }}
                          className="text-[10px] text-indigo-600 hover:underline mt-1 block"
                        >
                          Yoruma git →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/panel'
              ? pathname === '/panel'
              : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
