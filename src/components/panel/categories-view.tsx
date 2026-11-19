'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, FolderTree, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Smartphone, Shield, Headphones, BatteryCharging, Cable, Watch, MoreHorizontal,
  Plug, Usb, Flame, AudioLines, Speaker, Gamepad2, Sparkles, ToyBrick,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { api } from '@/lib/api'
import type { Category } from '@/lib/client-types'
import { faNumber, slugify } from '@/lib/format'

const ICONS: Record<string, React.ElementType> = {
  Smartphone, Shield, Headphones, BatteryCharging, Cable, Watch, MoreHorizontal,
  Plug, Usb, Flame, AudioLines, Speaker, Gamepad2, Sparkles, ToyBrick, Package,
}

type CategoryDialogState = { open: boolean; editing: Category | null }

export function CategoriesView() {
  const { dataVersion, bumpData, session, openCategoryProducts } = usePanel()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dlg, setDlg] = useState<CategoryDialogState>({ open: false, editing: null })

  const canManage = canDo(session?.role, 'category.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ categories: Category[] }>('/api/categories')
      setCategories(res.categories)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, dataVersion])

  const parents = categories.filter((c) => !c.parentId)
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id)

  async function remove(c: Category) {
    if (!window.confirm(`دسته‌بندی «${c.name}» حذف شود؟`)) return
    try {
      await api(`/api/categories/${c.id}`, { method: 'DELETE' })
      toast({ title: 'دسته‌بندی حذف شد', description: c.name })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'حذف ناموفق', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-4 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" /></CardContent></Card>)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">دسته‌بندی‌ها</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{faNumber(categories.length)} دسته و زیرمجموعه</p>
        </div>
        {canManage && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDlg({ open: true, editing: null })}>
            <Plus className="w-4 h-4" /> دسته‌بندی جدید
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {parents.map((parent) => {
          const Icon = ICONS[parent.icon || ''] || MoreHorizontal
          const kids = childrenOf(parent.id)
          return (
            <Card
              key={parent.id}
              className="border-blue-100 dark:border-slate-800 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              onClick={() => openCategoryProducts(parent.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                    <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                  </span>
                  <span className="truncate">{parent.name}</span>
                </CardTitle>
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDlg({ open: true, editing: parent }) }} aria-label="ویرایش">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); remove(parent) }} aria-label="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Package className="w-3.5 h-3.5" /> تعداد محصول
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {faNumber(parent._count?.products || 0)}
                  </Badge>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openCategoryProducts(parent.id) }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-blue-50/60 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> نمایش محصولات این دسته
                </button>
                {kids.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    {kids.map((kid) => {
                      const KidIcon = ICONS[kid.icon || ''] || MoreHorizontal
                      return (
                        <div
                          key={kid.id}
                          onClick={() => openCategoryProducts(kid.id)}
                          className="flex items-center justify-between rounded-md bg-blue-50/70 dark:bg-slate-900 px-2.5 py-1.5 cursor-pointer hover:bg-blue-100/70 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <KidIcon className="w-3.5 h-3.5 text-blue-400" />
                            {kid.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">{faNumber(kid._count?.products || 0)}</span>
                            {canManage && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); setDlg({ open: true, editing: kid }) }} className="text-slate-400 hover:text-blue-600" aria-label="ویرایش زیرمجموعه">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); remove(kid) }} className="text-slate-400 hover:text-red-500" aria-label="حذف زیرمجموعه">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {parents.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 text-center py-16">
            <FolderTree className="w-10 h-10 text-blue-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">هنوز دسته‌بندی‌ای ساخته نشده است</p>
          </div>
        )}
      </div>

      {dlg.open && (
        <CategoryDialog
          editing={dlg.editing}
          categories={categories}
          onClose={() => setDlg({ open: false, editing: null })}
          onSaved={() => { setDlg({ open: false, editing: null }); bumpData() }}
        />
      )}
    </div>
  )
}

function CategoryDialog({
  editing, categories, onClose, onSaved,
}: {
  editing: Category | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(editing?.name || '')
  const [icon, setIcon] = useState(editing?.icon || 'Smartphone')
  const [parentId, setParentId] = useState(editing?.parentId || 'none')
  const [active, setActive] = useState(editing?.active ?? true)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast({ title: 'نام الزامی است', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = { name, icon, parentId: parentId === 'none' ? null : parentId, active, slug: editing?.slug || slugify(name) }
      if (editing) {
        await api(`/api/categories/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        toast({ title: 'دسته‌بندی ویرایش شد' })
      } else {
        await api('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
        toast({ title: 'دسته‌بندی ساخته شد', description: name })
      }
      onSaved()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</DialogTitle>
          <DialogDescription>نمونه‌ها: گوشی، قاب و گلس، ایرپاد و هندزفری، شارژر و کابل</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>نام *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>آیکن</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ICONS).map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>دستهٔ والد</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون والد (دستهٔ اصلی)</SelectItem>
                {categories.filter((c) => !c.parentId && c.id !== editing?.id).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>فعال</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
