'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, UserRoundCheck, UserRoundX, KeyRound, Loader2, ShieldCheck, History, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { usePanel } from '@/store/panel'
import { api } from '@/lib/api'
import type { UserRow, LoginLogRow, AuditLogRow } from '@/lib/client-types'
import { ROLE_LABELS, jalaliDateTime } from '@/lib/format'

export function UsersView() {
  const { dataVersion, bumpData, session } = usePanel()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loginLogs, setLoginLogs] = useState<LoginLogRow[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dlgOpen, setDlgOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, l, a] = await Promise.all([
        api<{ users: UserRow[] }>('/api/users'),
        api<{ logs: LoginLogRow[] }>('/api/login-logs'),
        api<{ logs: AuditLogRow[] }>('/api/audit-logs'),
      ])
      setUsers(u.users)
      setLoginLogs(l.logs)
      setAuditLogs(a.logs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, dataVersion])

  async function patchUser(u: UserRow, patch: Record<string, unknown>, desc: string) {
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      toast({ title: desc })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'bg-blue-600 text-white',
      ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      STAFF: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      VIEWER: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
    }
    return <Badge className={`border-0 ${map[role]}`}>{ROLE_LABELS[role] || role}</Badge>
  }

  if (loading) {
    return <Card><CardContent className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></CardContent></Card>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">کاربران و لاگ‌ها</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">مدیریت حساب‌ها، لاگ ورود و سوابق تغییرات</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setDlgOpen(true) }}>
          <Plus className="w-4 h-4" /> کاربر جدید
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="flex items-center gap-1.5"><UserRoundCheck className="w-4 h-4" /> کاربران</TabsTrigger>
          <TabsTrigger value="logins" className="flex items-center gap-1.5"><History className="w-4 h-4" /> لاگ ورود</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5"><ScrollText className="w-4 h-4" /> لاگ تغییرات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-3">
          <Card className="border-blue-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto nice-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کاربر</TableHead>
                    <TableHead>نقش</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="hidden md:table-cell">تاریخ ساخت</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">{u.name?.[0] || '؟'}</span>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-slate-400" dir="ltr">@{u.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session?.id === u.id ? (
                          roleBadge(u.role)
                        ) : (
                          <Select value={u.role} onValueChange={(v) => patchUser(u, { role: v }, 'نقش کاربر تغییر کرد')}>
                            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.active}
                            disabled={session?.id === u.id}
                            onCheckedChange={(v) => patchUser(u, { active: v }, v ? 'حساب فعال شد' : 'حساب غیرفعال شد')}
                            aria-label="فعال/غیرفعال"
                          />
                          <span className="text-sm text-slate-500">{u.active ? 'فعال' : 'غیرفعال'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">{jalaliDateTime(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="h-7" onClick={() => { setEditing(u); setDlgOpen(true) }}>
                            <KeyRound className="w-3.5 h-3.5" /> تغییر رمز
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="mt-3">
          <Card className="border-blue-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto nice-scroll max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کاربر</TableHead>
                    <TableHead>نتیجه</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead>زمان</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-sm" dir="ltr">@{l.username}</TableCell>
                      <TableCell>
                        {l.success ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">موفق</Badge>
                        ) : (
                          <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">ناموفق</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-400" dir="ltr">{l.ip || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-500 whitespace-nowrap">{jalaliDateTime(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-3">
          <Card className="border-blue-100 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                سوابق تغییرات مهم (۱۵۰ مورد اخیر)
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto nice-scroll space-y-1.5">
              {auditLogs.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-blue-50 dark:border-slate-800 px-3 py-1.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-700 dark:text-slate-200" dir="ltr">{a.action}</span>
                    {a.details && <span className="text-slate-400 text-xs mr-2 truncate inline-block max-w-72">{a.details}</span>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{jalaliDateTime(a.createdAt)}</span>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">سابقه‌ای موجود نیست</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dlgOpen && (
        <UserDialog
          editing={editing}
          onClose={() => setDlgOpen(false)}
          onSaved={() => { setDlgOpen(false); bumpData() }}
        />
      )}
    </div>
  )
}

function UserDialog({ editing, onClose, onSaved }: { editing: UserRow | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const isReset = !!editing
  const [username, setUsername] = useState(editing?.username || '')
  const [name, setName] = useState(editing?.name || '')
  const [role, setRole] = useState(editing?.role || 'STAFF')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      if (isReset) {
        if (!password) { toast({ title: 'رمز جدید را وارد کنید', variant: 'destructive' }); setSaving(false); return }
        await api(`/api/users/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ password }) })
        toast({ title: 'رمز عبور تغییر کرد', description: editing.name })
      } else {
        await api('/api/users', {
          method: 'POST',
          body: JSON.stringify({ username, name, role, password }),
        })
        toast({ title: 'کاربر ساخته شد', description: `${name} (@${username})` })
      }
      onSaved()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isReset ? `تغییر رمز ${editing.name}` : 'کاربر جدید'}</DialogTitle>
          <DialogDescription>
            {isReset ? 'رمز جدید حداقل ۸ کاراکتر با حروف و عدد' : 'ثبت‌نام عمومی وجود ندارد؛ فقط مدیر کل کاربر می‌سازد'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!isReset && (
            <>
              <div className="space-y-2">
                <Label>نام و نام‌خانوادگی *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نام کاربری *</Label>
                <Input dir="ltr" className="text-left" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نقش</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>{isReset ? 'رمز عبور جدید *' : 'رمز عبور *'}</Label>
            <Input type="password" dir="ltr" className="text-left" value={password} onChange={(e) => setPassword(e.target.value)} />
            {password && (
              <p className={`text-xs ${(password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)) ? 'text-emerald-600' : 'text-red-500'}`}>
                {(password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password))
                  ? 'رمز قوی است'
                  : 'حداقل ۸ کاراکتر با ترکیب حروف و عدد'}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isReset ? 'تغییر رمز' : 'ساخت کاربر'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
