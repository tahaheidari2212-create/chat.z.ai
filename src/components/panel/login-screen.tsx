'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, LockKeyhole, Store, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { usePanel, type SessionUser } from '@/store/panel'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setSession = usePanel((s) => s.setSession)
  const setStoreName = usePanel((s) => s.setStoreName)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api<{ user: SessionUser; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, remember }),
      })
      if (res.token) {
        try { localStorage.setItem('panel_token', res.token) } catch { /* ignore */ }
      }
      setSession(res.user)
      const me = await api<{ storeName?: string }>('/api/auth/me')
      if (me.storeName) setStoreName(me.storeName)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ورود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">پنل مدیریت فروشگاه موبایل</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">برای ادامه وارد حساب خود شوید</p>
        </div>

        <Card className="border-blue-100 dark:border-slate-800 shadow-xl shadow-blue-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LockKeyhole className="w-4 h-4 text-blue-600" />
              ورود مدیران
            </CardTitle>
            <CardDescription>فقط ادمین‌های فروشگاه اجازه ورود دارند</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input
                  id="username"
                  dir="ltr"
                  className="text-left"
                  placeholder="taha"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    dir="ltr"
                    className="text-left pl-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                    aria-label={showPw ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  مرا به خاطر بسپار
                </Label>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-md px-3 py-2 border border-red-200 dark:border-red-900">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                ورود به پنل
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
