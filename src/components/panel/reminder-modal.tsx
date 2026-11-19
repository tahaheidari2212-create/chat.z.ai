'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, Edit3, Loader2, Search } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { api } from '@/lib/api'
import type { Category, Product } from '@/lib/client-types'
import { faMoney, faNumber } from '@/lib/format'

/**
 * Daily price reminder modal:
 * - «تغییری نکرده» records today's confirmation
 * - «بله» opens the quick-edit price table (saved in one click)
 */
export function ReminderModal() {
  const { reminderOpen, setReminderOpen, setPriceEditOpen, session, bumpData } = usePanel()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [alreadyChecked, setAlreadyChecked] = useState<boolean | null>(null)

  const canUpdate = canDo(session?.role, 'product.update')

  useEffect(() => {
    if (!reminderOpen || !canUpdate) return
    api<{ checked: boolean }>('/api/price-check').then((r) => setAlreadyChecked(r.checked)).catch(() => setAlreadyChecked(false))
  }, [reminderOpen, canUpdate])

  async function confirmNoChange() {
    setBusy(true)
    try {
      await api('/api/price-check', { method: 'POST', body: JSON.stringify({ status: 'CONFIRMED' }) })
      toast({ title: 'ثبت شد', description: 'تأیید شما ثبت شد؛ تا فردا دوباره پرسیده نمی‌شود' })
      setReminderOpen(false)
      bumpData()
    } finally {
      setBusy(false)
    }
  }

  if (!reminderOpen || !canUpdate) return null

  return (
    <Dialog open onOpenChange={(v) => !v && setReminderOpen(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
              <BellRing className="w-5 h-5" />
            </span>
            یادآور روزانهٔ قیمت
          </DialogTitle>
          <DialogDescription>
            {alreadyChecked ? (
              'قیمت‌های امروز قبلاً بررسی شده است.'
            ) : (
              'قیمت محصولات امروز تغییر کرده است؟ اگر پاسخ ندهید، هر ۳۰ دقیقه دوباره پرسیده می‌شود و هشدار در داشبورد می‌ماند.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button variant="outline" onClick={confirmNoChange} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            تغییری نکرده
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setReminderOpen(false)
              setPriceEditOpen(true)
            }}
          >
            <Edit3 className="w-4 h-4" /> بله، قیمت‌ها را ویرایش می‌کنم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Quick price edit table with category filter and one-click save (bulk). */
export function PriceEditDialog() {
  const { priceEditOpen, setPriceEditOpen, bumpData } = usePanel()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState('')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!priceEditOpen) return
    setLoading(true)
    Promise.all([
      api<{ items: Product[] }>('/api/products?perPage=100&sort=name'),
      api<{ categories: Category[] }>('/api/categories'),
    ])
      .then(([p, c]) => {
        setProducts(p.items)
        setCategories(c.categories)
        setPrices(Object.fromEntries(p.items.map((x) => [x.id, String(x.salePrice)])))
      })
      .finally(() => setLoading(false))
  }, [priceEditOpen])

  const visible = useMemo(() => {
    let list = products
    if (category !== 'all') {
      const childIds = categories.filter((c) => c.parentId === category).map((c) => c.id)
      list = list.filter((p) => p.categoryId === category || childIds.includes(p.categoryId))
    }
    if (filter) {
      const f = filter.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(f) || p.sku.toLowerCase().includes(f))
    }
    return list
  }, [products, categories, category, filter])

  const changedCount = products.filter((p) => prices[p.id] && parseInt(prices[p.id], 10) !== p.salePrice).length

  async function save() {
    const updates = products
      .filter((p) => prices[p.id] && parseInt(prices[p.id], 10) !== p.salePrice)
      .map((p) => ({ id: p.id, newPrice: parseInt(prices[p.id], 10) }))
    if (updates.length === 0) {
      toast({ title: 'تغییری برای ذخیره نیست' })
      return
    }
    setSaving(true)
    try {
      await api('/api/price-bulk', { method: 'POST', body: JSON.stringify({ updates }) })
      toast({ title: 'قیمت‌ها ذخیره شد', description: `${faNumber(updates.length)} محصول به‌روزرسانی و در تاریخچهٔ قیمت ثبت شد` })
      setPriceEditOpen(false)
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={priceEditOpen} onOpenChange={setPriceEditOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-600" /> ویرایش سریع قیمت‌ها
          </DialogTitle>
          <DialogDescription>
            قیمت جدید را وارد و همه را یکجا ذخیره کنید؛ تاریخچهٔ قیمت هر محصول ثبت می‌شود.
            {changedCount > 0 && <span className="text-blue-600 font-medium"> ({faNumber(changedCount)} تغییر)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 my-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="جستجو..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pr-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40"><SelectValue placeholder="دسته" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ دسته‌ها</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-80 overflow-y-auto nice-scroll rounded-lg border border-blue-100 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>محصول</TableHead>
                <TableHead className="hidden sm:table-cell">دسته</TableHead>
                <TableHead>قیمت فعلی</TableHead>
                <TableHead>قیمت جدید (تومان)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">محصولی یافت نشد</TableCell></TableRow>
              ) : (
                visible.map((p) => {
                  const newValue = prices[p.id] || ''
                  const changed = parseInt(newValue, 10) !== p.salePrice
                  return (
                    <TableRow key={p.id} className={changed ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-slate-400">{p.category.name}</TableCell>
                      <TableCell className="text-sm text-slate-500 whitespace-nowrap">{faMoney(p.salePrice)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          dir="ltr"
                          className="text-left h-8 w-32"
                          value={newValue}
                          onChange={(e) => setPrices((s) => ({ ...s, [p.id]: e.target.value }))}
                          aria-label={`قیمت جدید ${p.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <BellRing className="w-3 h-3" />
            پس از ذخیره، قیمت امروز «بررسی‌شده» ثبت می‌شود
          </Label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPriceEditOpen(false)}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره همه ({faNumber(changedCount)})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
