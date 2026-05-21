'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

export default function PanelSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">GMB AI</h1>
        <p className="text-xs text-gray-400 mt-0.5">İşletme Paneli</p>
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
