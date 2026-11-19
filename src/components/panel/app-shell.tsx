'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, StickyNote, Users, Settings,
  Store, Calculator, Search, LogOut, Moon, Sun, ChevronLeft, Menu, X, BellRing,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePanel, canDo, type PanelView } from '@/store/panel'
import { api } from '@/lib/api'
import { ROLE_LABELS, tehranTime } from '@/lib/format'
import { DashboardView } from './dashboard-view'
import { ProductsView } from './products-view'
import { CategoriesView } from './categories-view'
import { SalesView } from './sales-view'
import { NotesView } from './notes-view'
import { UsersView } from './users-view'
import { SettingsView } from './settings-view'
import { CalculatorWidget } from './calculator-widget'
import { GlobalSearch } from './global-search'
import { ReminderModal } from './reminder-modal'
import { AiChatWidget } from './ai-chat'

const NAV: { key: PanelView; label: string; icon: React.ElementType; perm: string }[] = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, perm: 'report.view' },
  { key: 'products', label: 'محصولات', icon: Package, perm: 'product.view' },
  { key: 'categories', label: 'دسته‌بندی‌ها', icon: FolderTree, perm: 'category.view' },
  { key: 'sales', label: 'تاریخچه فروش', icon: ShoppingCart, perm: 'report.view' },
  { key: 'notes', label: 'یادداشت‌ها', icon: StickyNote, perm: 'note.view' },
  { key: 'users', label: 'کاربران و لاگ‌ها', icon: Users, perm: 'user.manage' },
  { key: 'settings', label: 'تنظیمات', icon: Settings, perm: 'report.view' },
]

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const { view, setView, session, storeName, calcOpen, setCalcOpen, searchOpen, setSearchOpen, sidebarCollapsed, toggleSidebar } = usePanel()
  const { theme, setTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const setReminderOpen = usePanel((s) => s.setReminderOpen)
  const reminderChecked = useRef(false)
  const lastAskedAt = useRef(0)

  // Ctrl+K opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  // daily price reminder: poll every minute (Tehran time)
  useEffect(() => {
    if (!session || !canDo(session.role, 'product.update')) return
    let cancelled = false

    async function tick() {
      try {
        const [setting, check] = await Promise.all([
          api<{ setting: { reminderEnabled: boolean; reminderHour: number; reminderMinute: number } | null }>('/api/settings'),
          api<{ checked: boolean }>('/api/price-check'),
        ])
        if (cancelled || !setting.setting || !setting.setting.reminderEnabled) return
        const target = `${String(setting.setting.reminderHour).padStart(2, '0')}:${String(setting.setting.reminderMinute).padStart(2, '0')}`
        const now = tehranTime()
        if (now >= target && !check.checked) {
          reminderChecked.current = false
          // re-ask every 30 minutes if unanswered
          if (Date.now() - lastAskedAt.current > 30 * 60 * 1000) {
            lastAskedAt.current = Date.now()
            setReminderOpen(true)
          }
        }
      } catch {
        // silent — dashboard alert covers this state
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [session, setReminderOpen])

  async function logout() {
    try { localStorage.removeItem('panel_token') } catch { /* ignore */ }
    await api('/api/auth/logout', { method: 'POST' })
    onLogout()
  }

  const navItems = NAV.filter((n) => canDo(session?.role, n.perm))

  const sidebar = (
    <aside
      className={`h-full flex flex-col bg-white dark:bg-slate-950 border-l border-blue-100 dark:border-slate-800 transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-blue-100 dark:border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shrink-0">
          <Store className="w-5 h-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{storeName}</p>
            <p className="text-[11px] text-slate-400">پنل مدیریت</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto nice-scroll py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key)
                setMobileNavOpen(false)
              }}
              title={item.label}
              className={`w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white font-medium shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-blue-100 dark:border-slate-800">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-900"
          aria-label="جمع‌کردن سایدبار"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          {!sidebarCollapsed && 'جمع‌کردن منو'}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex flex-row-reverse bg-background" dir="rtl">
      {/* desktop sidebar */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 z-30">{sidebar}</div>

      {/* mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative ml-auto mr-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className={`flex-1 min-w-0 flex flex-col min-h-screen ${sidebarCollapsed ? 'md:pr-16' : 'md:pr-60'}`}>
        {/* header */}
        <header className="sticky top-0 z-20 h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-blue-100 dark:border-slate-800 flex items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="بازکردن منو"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-blue-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-sm hover:bg-blue-100 dark:hover:bg-slate-800 transition-colors min-w-0 flex-1 max-w-xs"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">جستجو در پنل...</span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[10px] mr-auto font-sans">
              Ctrl+K
            </kbd>
          </button>

          <div className="mr-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalcOpen(!calcOpen)}
              title="ماشین‌حساب"
              aria-label="ماشین‌حساب"
            >
              <Calculator className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReminderOpen(true)}
              title="یادآور قیمت امروز"
              aria-label="یادآور قیمت امروز"
            >
              <BellRing className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="حالت تاریک/روشن"
              aria-label="حالت تاریک/روشن"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pr-1 pl-2 py-1 hover:bg-blue-50 dark:hover:bg-slate-900 transition-colors">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {session?.name?.[0] || '؟'}
                  </span>
                  <span className="hidden sm:block text-sm text-slate-700 dark:text-slate-200">{session?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{session?.name}</span>
                    <span className="text-xs text-slate-400 font-normal">@{session?.username}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div className="flex items-center justify-between w-full">
                    <span>سطح دسترسی</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {ROLE_LABELS[session?.role || ''] || session?.role}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
                  <LogOut className="w-4 h-4 ml-2" />
                  خروج از حساب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* content */}
        <main className="flex-1 p-4 md:p-6">
          {view === 'dashboard' && <DashboardView />}
          {view === 'products' && <ProductsView />}
          {view === 'categories' && <CategoriesView />}
          {view === 'sales' && <SalesView />}
          {view === 'notes' && <NotesView />}
          {view === 'users' && <UsersView />}
          {view === 'settings' && <SettingsView />}
        </main>

        <footer className="mt-auto border-t border-blue-100 dark:border-slate-800 px-4 py-3 text-center text-xs text-slate-400 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {storeName} — پنل مدیریت فروشگاه
        </footer>
      </div>

      {/* floating helpers */}
      <CalculatorWidget />
      <GlobalSearch />
      <ReminderModal />
      <AiChatWidget />
      {searchOpen && (
        <button className="hidden" onClick={() => setSearchOpen(false)} aria-hidden>
          <X />
        </button>
      )}
    </div>
  )
}
