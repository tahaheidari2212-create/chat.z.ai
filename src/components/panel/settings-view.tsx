'use client'

import { useCallback, useEffect, useState } from 'react'
import { Store, BellRing, Webhook, KeyRound, Save, Loader2, RefreshCw, Copy, Check, Sparkles, PlugZap, Trash2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { api } from '@/lib/api'
import type { SettingsData } from '@/lib/client-types'
import { faNumber } from '@/lib/format'
import { AiChatPanel } from './ai-chat-panel'

export function SettingsView() {
  const { setStoreName, session } = usePanel()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const [form, setForm] = useState({
    storeName: '',
    reminderEnabled: true,
    reminderHour: 10,
    reminderMinute: 0,
    webhookUrl: '',
    currency: 'TOMAN',
    apiKey: '',
    geminiKey: '',
    geminiConfigured: false,
    geminiMasked: '',
    aiProvider: 'zai',
    geminiProxyUrl: '',
  })

  const canManage = canDo(session?.role, 'settings.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<SettingsData>('/api/settings')
      setForm({
        storeName: res.setting.storeName,
        reminderEnabled: res.setting.reminderEnabled,
        reminderHour: res.setting.reminderHour,
        reminderMinute: res.setting.reminderMinute,
        webhookUrl: res.setting.webhookUrl || '',
        currency: res.setting.currency,
        apiKey: res.setting.apiKey || '',
        geminiKey: '',
        geminiConfigured: Boolean(res.setting.geminiConfigured),
        geminiMasked: res.setting.geminiMasked || '',
        aiProvider: res.setting.aiProvider || 'zai',
        geminiProxyUrl: res.setting.geminiProxyUrl || '',
      })
      setStoreName(res.setting.storeName)
    } finally {
      setLoading(false)
    }
  }, [setStoreName])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    try {
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          storeName: form.storeName,
          reminderEnabled: form.reminderEnabled,
          reminderHour: form.reminderHour,
          reminderMinute: form.reminderMinute,
          webhookUrl: form.webhookUrl,
          currency: form.currency,
          aiProvider: form.aiProvider,
          geminiProxyUrl: form.geminiProxyUrl,
          ...(form.geminiKey.trim() ? { geminiKey: form.geminiKey.trim() } : {}),
        }),
      })
      toast({ title: 'تنظیمات ذخیره شد' })
      setStoreName(form.storeName)
      if (form.geminiKey.trim()) {
        setForm((f) => ({ ...f, geminiKey: '' }))
        await refreshGeminiStatus()
        void testGemini() // auto-test so the user immediately knows the key works
      }
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function testGemini() {
    setTesting(true)
    try {
      const res = await api<{ ok: boolean; reply?: string; providerLabel?: string }>('/api/ai/test', { method: 'POST' })
      toast({ title: 'اتصال موفق', description: `${res.providerLabel ? `(${res.providerLabel}) ` : ''}${res.reply || 'هوش مصنوعی پاسخ داد'}` })
    } catch (err) {
      toast({ title: 'اتصال ناموفق', description: err instanceof Error ? err.message : 'تست ناموفق', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  /** Re-fetch only the Gemini status (configured + masked) without resetting the whole form. */
  const refreshGeminiStatus = useCallback(async () => {
    try {
      const res = await api<SettingsData>('/api/settings')
      setForm((f) => ({
        ...f,
        geminiConfigured: Boolean(res.setting.geminiConfigured),
        geminiMasked: res.setting.geminiMasked || '',
        aiProvider: res.setting.aiProvider || 'zai',
        geminiProxyUrl: res.setting.geminiProxyUrl || '',
      }))
    } catch { /* ignore */ }
  }, [])

  async function clearGemini() {
    if (!window.confirm('کلید هوش مصنوعی حذف شود؟')) return
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify({ geminiKey: '' }) })
      setForm((f) => ({ ...f, geminiConfigured: false, geminiMasked: '', geminiKey: '' }))
      await refreshGeminiStatus()
      toast({ title: 'کلید حذف شد' })
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  async function regenerateKey() {
    if (!window.confirm('کلید API فعلی باطل و کلید جدید ساخته می‌شود. مطمئنید؟')) return
    try {
      const res = await api<{ setting: { apiKey: string } }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ regenerateApiKey: true }),
      })
      setForm((f) => ({ ...f, apiKey: res.setting.apiKey }))
      toast({ title: 'کلید API جدید ساخته شد' })
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  if (loading) {
    return <Card><CardContent className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></CardContent></Card>
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">تنظیمات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">مشخصات فروشگاه، یادآور قیمت، API و وب‌هوک</p>
      </div>

      <Card className="border-blue-100 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" /> فروشگاه
          </CardTitle>
          <CardDescription>نام فروشگاه و واحد پول نمایش داده‌شده در پنل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>نام فروشگاه</Label>
            <Input value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} disabled={!canManage} />
          </div>
          <div className="space-y-2 w-48">
            <Label>واحد پول</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))} disabled={!canManage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TOMAN">تومان</SelectItem>
                <SelectItem value="RIAL">ریال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-600" /> یادآور روزانهٔ قیمت
          </CardTitle>
          <CardDescription>
            در ساعت مشخص هر روز (به وقت ایران) پنجره‌ای باز می‌شود و می‌پرسد «قیمت محصولات تغییر کرده است؟» — اگر پاسخ ندهید هر ۳۰ دقیقه تکرار می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-blue-100 dark:border-slate-800 px-3 py-2.5">
            <Label>یادآور فعال باشد</Label>
            <Switch
              checked={form.reminderEnabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, reminderEnabled: v }))}
              disabled={!canManage}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <div className="space-y-2">
              <Label>ساعت</Label>
              <Input
                type="number" dir="ltr" className="text-left" min={0} max={23}
                value={form.reminderHour}
                onChange={(e) => setForm((f) => ({ ...f, reminderHour: parseInt(e.target.value || '0', 10) }))}
                disabled={!canManage}
              />
            </div>
            <div className="space-y-2">
              <Label>دقیقه</Label>
              <Input
                type="number" dir="ltr" className="text-left" min={0} max={59}
                value={form.reminderMinute}
                onChange={(e) => setForm((f) => ({ ...f, reminderMinute: parseInt(e.target.value || '0', 10) }))}
                disabled={!canManage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="w-4 h-4 text-blue-600" /> وب‌هوک محصولات
            </CardTitle>
            <CardDescription>
              با ساخت، ویرایش یا حذف محصول، رویداد به این آدرس POST می‌شود (اختیاری)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              dir="ltr" className="text-left" placeholder="https://example.com/webhook/products"
              value={form.webhookUrl}
              onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
            />
          </CardContent>
        </Card>
      )}

      {canManage && form.apiKey && (
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" /> کلید API عمومی
            </CardTitle>
            <CardDescription>
              برای اتصال سرویس‌های بیرونی: هدر <code dir="ltr" className="text-xs bg-blue-50 dark:bg-slate-900 px-1 rounded">x-api-key</code> با این مقدار و مسیر{' '}
              <code dir="ltr" className="text-xs bg-blue-50 dark:bg-slate-900 px-1 rounded">/api/v1/products</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input dir="ltr" className="text-left font-mono text-xs" readOnly value={form.apiKey} />
              <Button
                size="icon" variant="outline" className="shrink-0"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(form.apiKey); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
                }}
                aria-label="کپی کلید"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="outline" className="shrink-0" onClick={regenerateKey} aria-label="ساخت کلید جدید">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> موتور هوش مصنوعی
            </CardTitle>
            <CardDescription>
              موتور داخلی z.ai بدون توکن و بدون محدودیت جغرافیایی کار می‌کند و «تولید خودکار توضیح» در فرم محصول و دستیار گفت‌وگو را فعال می‌کند. اگر کلید Gemini دارید، موتور را روی Gemini بگذارید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-xs text-slate-500 shrink-0">موتور فعال:</Label>
              <Select
                value={form.aiProvider}
                onValueChange={(v) => setForm((f) => ({ ...f, aiProvider: v }))}
                disabled={!canManage || saving}
              >
                <SelectTrigger className="w-[240px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zai">داخلی z.ai — بدون توکن، همیشه فعال</SelectItem>
                  <SelectItem value="gemini">Gemini گوگل — با کلید</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {form.aiProvider === 'zai' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
                    <Check className="w-3 h-3" /> فعال — بدون نیاز به توکن
                  </span>
                ) : form.geminiConfigured ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
                      <Check className="w-3 h-3" /> فعال — کلید ذخیره شده
                    </span>
                    {form.geminiMasked && (
                      <code dir="ltr" className="text-xs text-slate-400 font-mono">{form.geminiMasked}</code>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-0.5 text-xs">
                    غیرفعال — کلید ثبت نشده
                  </span>
                )}
              </div>
            </div>
            {form.aiProvider === 'gemini' && form.geminiConfigured && form.geminiMasked.startsWith('AQ.') && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                توجه: کلید ذخیره‌شده یک «توکن موقت OAuth» است (با AQ شروع می‌شود). گوگل آن را می‌پذیرد ولی معمولاً بعد از حدود یک ساعت منقضی می‌شود و باید دوباره وارد شود. کلید دائمی با AIza از aistudio.google.com/app/apikey قابل گرفتن است.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                dir="ltr"
                type="password"
                className="text-left font-mono text-xs"
                placeholder="کلید Gemini (با AIza یا توکن AQ.)"
                value={form.geminiKey}
                onChange={(e) => setForm((f) => ({ ...f, geminiKey: e.target.value }))}
                autoComplete="off"
              />
              <Button
                size="sm" variant="outline" className="shrink-0"
                onClick={testGemini} disabled={testing}
                title="تست اتصال موتور فعال"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                تست
              </Button>
              {form.geminiConfigured && (
                <Button size="sm" variant="outline" className="shrink-0 text-red-600 hover:text-red-700" onClick={clearGemini} title="حذف کلید">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {form.aiProvider === 'gemini' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">پروکسی برای Gemini (اختیاری)</Label>
                <Input
                  dir="ltr"
                  className="text-left font-mono text-xs"
                  placeholder="http://host:port"
                  value={form.geminiProxyUrl}
                  onChange={(e) => setForm((f) => ({ ...f, geminiProxyUrl: e.target.value }))}
                  autoComplete="off"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  گوگل API گمنی را از ایران و برخی مناطق مسدود کرده است؛ اگر تست با خطای «موقعیت مکانی» ناموفق شد، آدرس یک پروکسی HTTP خارج از آن مناطق را اینجا وارد کنید و ذخیره کنید.
                </p>
              </div>
            )}
            {form.aiProvider === 'gemini' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                کلید را از{' '}
                <a dir="ltr" className="text-blue-600 hover:underline dark:text-blue-400" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                  aistudio.google.com/app/apikey
                </a>{' '}
                بگیر (با AIza شروع می‌شود). توکن‌های موقت با AQ. هم توسط گوگل پذیرفته می‌شوند ولی زود منقضی می‌شوند. پس از «ذخیره تنظیمات»، اتصال خودکار تست می‌شود.
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                این موتور از سر خود پنل استفاده می‌کند؛ هیچ توکنی لازم نیست و به کلید Gemini ربطی ندارد. کلید Gemini را می‌توانی هم‌زمان ذخیره نگه داری تا بعداً موتور را عوض کنی.
              </p>
            )}
            {form.geminiKey.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                کلید جدید پس از زدن «ذخیره تنظیمات» ثبت می‌شود.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-100 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" /> گفت‌وگو با هوش مصنوعی
          </CardTitle>
          <CardDescription>
            دستیار فروشگاه به داده‌های زنده پنل دسترسی دارد؛ موجودی، فروش‌ها و پرفروش‌ترین محصولات را بپرسید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiChatPanel geminiConfigured={form.geminiConfigured} />
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره تنظیمات
          </Button>
        </div>
      )}
    </div>
  )
}
