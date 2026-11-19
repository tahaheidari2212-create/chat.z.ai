'use client'

import { useCallback, useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Loader2, Store } from 'lucide-react'
import { usePanel, type SessionUser } from '@/store/panel'
import { api } from '@/lib/api'
import type { SessionPayload } from '@/lib/client-types'
import { LoginScreen } from '@/components/panel/login-screen'
import { AppShell } from '@/components/panel/app-shell'
import { PriceEditDialog } from '@/components/panel/reminder-modal'

function PanelRoot() {
  const [loading, setLoading] = useState(true)
  const session = usePanel((s) => s.session)
  const setSession = usePanel((s) => s.setSession)
  const setStoreName = usePanel((s) => s.setStoreName)

  const fetchMe = useCallback(async () => {
    try {
      const res = await api<SessionPayload>('/api/auth/me')
      setSession(res.user)
      if (res.storeName) setStoreName(res.storeName)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [setSession, setStoreName])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <Store className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          در حال بارگذاری پنل...
        </div>
      </div>
    )
  }

  return session ? <AppShell onLogout={() => setSession(null)} /> : <LoginScreen onLogin={fetchMe} />
}

export default function Page() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <PanelRoot />
      <PriceEditDialog />
    </ThemeProvider>
  )
}
