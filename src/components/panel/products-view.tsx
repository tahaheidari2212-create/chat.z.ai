'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Package, Pencil, Copy, Trash2, ShoppingCart, Upload, Download,
  LayoutGrid, List, PackageX, RotateCcw, RefreshCw, ChevronRight, ChevronLeft, Wrench, Images,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { api, downloadFile } from '@/lib/api'
import type { Category, Product } from '@/lib/client-types'
import { faMoney, faNumber, STATUS_LABELS } from '@/lib/format'
import { ProductFormDialog } from './product-form-dialog'
import { ProductGalleryDialog } from './product-gallery-dialog'
import { SellDialog } from './sell-dialog'
import { StockAdjustDialog } from './stock-adjust-dialog'

type ListResponse = { total: number; page: number; perPage: number; items: Product[] }

const statusBadge = (p: Product) => {
  if (p.status === 'DRAFT') return { label: STATUS_LABELS.DRAFT, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300' }
  if (p.status === 'OUT' || p.stock === 0) return { label: STATUS_LABELS.OUT, cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' }
  if (p.status === 'ARCHIVED') return { label: STATUS_LABELS.ARCHIVED, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' }
  if (p.stock <= p.lowStockThreshold) return { label: 'کم‌موجودی', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' }
  return { label: STATUS_LABELS.PUBLISHED, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }
}

export function ProductsView() {
  const { session, dataVersion, bumpData } = usePanel()
  const { toast } = useToast()

  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(12)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(() => usePanel.getState().pendingCategoryFilter || 'all')
  const [status, setStatus] = useState('all')
  const [stock, setStock] = useState('all')
  const [sort, setSort] = useState('newest')
  const [layout, setLayout] = useState<'grid' | 'table'>('grid')
  const [trashMode, setTrashMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selling, setSelling] = useState<Product | null>(null)
  const [gallery, setGallery] = useState<{ p: Product; idx: number } | null>(null)
  const [adjusting, setAdjusting] = useState<Product | null>(null)

  const canManage = canDo(session?.role, 'product.create')
  const canEdit = canDo(session?.role, 'product.update')
  const canDelete = canDo(session?.role, 'product.delete')
  const canSell = canDo(session?.role, 'sale.create')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage), sort })
      if (search) params.set('search', search)
      if (category !== 'all') params.set('category', category)
      if (status !== 'all') params.set('status', status)
      if (stock !== 'all') params.set('stock', stock)
      if (trashMode) params.set('trash', '1')
      const res = await api<ListResponse>(`/api/products?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'بارگذاری ناموفق', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, category, status, stock, sort, trashMode, toast])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, dataVersion])

  useEffect(() => {
    api<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories)).catch(() => {})
  }, [dataVersion])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // پاک‌سازی فیلتر دستهٔ در انتظار (بعد از mount تا setState هنگام رندر رخ ندهد)
  useEffect(() => {
    if (usePanel.getState().pendingCategoryFilter) {
      usePanel.setState({ pendingCategoryFilter: null })
    }
  }, [])

  async function quickUpdate(p: Product, patch: Record<string, unknown>) {
    try {
      await api(`/api/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      toast({ title: 'ذخیره شد', description: `${p.name} به‌روزرسانی شد` })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
    }
  }

  async function duplicate(p: Product) {
    try {
      await api(`/api/products/${p.id}/duplicate`, { method: 'POST' })
      toast({ title: 'کپی ساخته شد', description: `از «${p.name}» نسخه جدید ساخته شد` })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'کپی ناموفق', variant: 'destructive' })
    }
  }

  async function trash(p: Product) {
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' })
      toast({ title: 'به سطل زباله منتقل شد', description: p.name })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'حذف ناموفق', variant: 'destructive' })
    }
  }

  async function restore(p: Product) {
    try {
      await api(`/api/products/${p.id}/restore`, { method: 'POST' })
      toast({ title: 'بازگردانی شد', description: p.name })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'بازگردانی ناموفق', variant: 'destructive' })
    }
  }

  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    if (selected.size === 0) return
    try {
      await api('/api/products/bulk', { method: 'POST', body: JSON.stringify({ ids: Array.from(selected), action, ...extra }) })
      toast({ title: 'عملیات گروهی انجام شد', description: `${faNumber(selected.size)} محصول` })
      setSelected(new Set())
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'عملیات ناموفق', variant: 'destructive' })
    }
  }

  async function bulkPricePercent() {
    const input = window.prompt('درصد تغییر قیمت (مثلاً ۳ برای افزایش و ۳- برای کاهش):')
    if (!input) return
    const pct = parseInt(input.replace(/[٪%]/g, ''), 10)
    if (!Number.isFinite(pct) || pct === 0) {
      toast({ title: 'درصد نامعتبر', variant: 'destructive' })
      return
    }
    await bulk('pricePercent', { percent: pct })
  }

  async function importCsv(file: File) {
    try {
      const res = await api<{ created: number; errors: string[] }>('/api/import', { method: 'POST', body: file })
      toast({
        title: 'ورود گروهی انجام شد',
        description: `${faNumber(res.created)} محصول ساخته شد${res.errors.length ? ` — ${faNumber(res.errors.length)} خطا` : ''}`,
      })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا در ورود CSV', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  const effectivePrice = (p: Product) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.salePrice)
  const allChecked = items.length > 0 && items.every((p) => selected.has(p.id))

  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(items.map((p) => p.id)))
  }

  const productCard = useMemo(() => (p: Product) => {
    const badge = statusBadge(p)
    return (
      <Card key={p.id} className="border-blue-100 dark:border-slate-800 overflow-hidden group">
        <div
          className="relative aspect-square bg-blue-50/60 dark:bg-slate-900"
          role={p.images.length > 0 ? 'button' : undefined}
          tabIndex={p.images.length > 0 ? 0 : undefined}
          onClick={() => p.images.length > 0 && setGallery({ p, idx: 0 })}
          onKeyDown={(e) => { if (p.images.length > 0 && e.key === 'Enter') setGallery({ p, idx: 0 }) }}
          aria-label={p.images.length > 0 ? `نمایش گالری ${p.name}` : undefined}
          title={p.images.length > 0 ? 'نمایش گالری تصاویر' : undefined}
        >
          {p.images[0] ? (
            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-blue-300" />
            </div>
          )}
          <Badge className={`absolute top-2 right-2 border-0 ${badge.cls}`}>{badge.label}</Badge>
          {p.images.length > 1 && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-[11px] rounded-md px-1.5 py-0.5">
              <Images className="w-3 h-3" /> {faNumber(p.images.length)} عکس
            </span>
          )}
        </div>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.category.name} · {p.sku}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${
                p.stock === 0
                  ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-slate-900 dark:text-blue-300'
              }`}
            >
              موجودی: {faNumber(p.stock)}
            </span>
          </div>
          <p className={`font-bold text-sm ${p.discountPrice ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}>
            {faMoney(effectivePrice(p))}
            {p.discountPrice && <span className="text-xs text-slate-400 line-through font-normal mr-1.5">{faMoney(p.salePrice)}</span>}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            {canSell && (
              <Button size="sm" className="flex-1 h-8 bg-blue-600 hover:bg-blue-700" disabled={p.stock === 0} onClick={() => setSelling(p)}>
                <ShoppingCart className="w-3.5 h-3.5" /> ثبت فروش
              </Button>
            )}
            {canEdit && (
              <>
                <Button size="icon" variant="outline" className="h-8 w-8" title="ویرایش سریع قیمت" onClick={() => {
                  const input = window.prompt(`قیمت جدید «${p.name}» (تومان):`, String(p.salePrice))
                  if (input) quickUpdate(p, { salePrice: input })
                }}>
                  <Wrench className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8" title="ویرایش کامل" onClick={() => { setEditing(p); setFormOpen(true) }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8" aria-label="عملیات بیشتر">
                  <List className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setAdjusting(p)}>
                    <Package className="w-4 h-4 ml-2" /> تغییر موجودی
                  </DropdownMenuItem>
                )}
                {canManage && (
                  <DropdownMenuItem onClick={() => duplicate(p)}>
                    <Copy className="w-4 h-4 ml-2" /> کپی محصول
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={() => trash(p)} className="text-red-600">
                    <Trash2 className="w-4 h-4 ml-2" /> حذف
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }, [canSell, canEdit, canManage, canDelete])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {trashMode ? 'سطل زباله محصولات' : 'همهٔ محصولات'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{faNumber(total)} محصول</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={layout === 'grid' ? 'default' : 'outline'} className={layout === 'grid' ? 'bg-blue-600' : ''} onClick={() => setLayout('grid')} aria-label="نمایش کارتی">
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button size="sm" variant={layout === 'table' ? 'default' : 'outline'} className={layout === 'table' ? 'bg-blue-600' : ''} onClick={() => setLayout('table')} aria-label="نمایش جدولی">
            <List className="w-4 h-4" />
          </Button>
          {canManage && (
            <>
              <Button
                size="sm" variant="outline"
                onClick={() => downloadFile('/api/export/excel?type=products', 'products.xlsx')
                  .catch((e) => toast({ title: 'خطا', description: e instanceof Error ? e.message : 'دانلود ناموفق', variant: 'destructive' }))}
              ><Download className="w-4 h-4" /> خروجی اکسل</Button>
              <Button
                size="sm" variant="outline"
                onClick={() => downloadFile('/api/export?type=products', 'products.csv')
                  .catch((e) => toast({ title: 'خطا', description: e instanceof Error ? e.message : 'دانلود ناموفق', variant: 'destructive' }))}
              ><Download className="w-4 h-4" /> خروجی CSV</Button>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importCsv(f)
                    e.target.value = ''
                  }}
                />
                <Button size="sm" variant="outline" asChild>
                  <span><Upload className="w-4 h-4" /> ورود CSV</span>
                </Button>
              </label>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="w-4 h-4" /> محصول جدید
              </Button>
            </>
          )}
          {canDelete && (
            <Button size="sm" variant={trashMode ? 'default' : 'ghost'} className={trashMode ? 'bg-blue-600' : 'text-slate-500'} onClick={() => { setTrashMode(!trashMode); setPage(1) }}>
              {trashMode ? <><Package className="w-4 h-4" /> خروج از سطل</> : <><Trash2 className="w-4 h-4" /> سطل زباله</>}
            </Button>
          )}
        </div>
      </div>

      {/* filters */}
      <Card className="border-blue-100 dark:border-slate-800">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="جستجو در نام، SKU، برند..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pr-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ دسته‌ها</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ وضعیت‌ها</SelectItem>
              <SelectItem value="PUBLISHED">منتشرشده</SelectItem>
              <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
              <SelectItem value="OUT">ناموجود</SelectItem>
              <SelectItem value="ARCHIVED">آرشیو</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stock} onValueChange={(v) => { setStock(v); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="موجودی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="in">موجود</SelectItem>
              <SelectItem value="low">کم‌موجودی</SelectItem>
              <SelectItem value="out">ناموجود</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40"><SelectValue placeholder="ترتیب" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">جدیدترین</SelectItem>
              <SelectItem value="name">نام (الفبا)</SelectItem>
              <SelectItem value="priceAsc">ارزان‌ترین</SelectItem>
              <SelectItem value="priceDesc">گران‌ترین</SelectItem>
              <SelectItem value="stockAsc">کمترین موجودی</SelectItem>
              <SelectItem value="stockDesc">بیشترین موجودی</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* bulk bar */}
      {selected.size > 0 && canEdit && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{faNumber(selected.size)} محصول انتخاب شده</span>
          {!trashMode && (
            <Select onValueChange={(v) => { if (v !== 'x') bulk('status', { status: v }) }}>
              <SelectTrigger className="w-36 h-8 bg-white dark:bg-slate-950"><SelectValue placeholder="تغییر وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLISHED">منتشرشده</SelectItem>
                <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                <SelectItem value="ARCHIVED">آرشیو</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select onValueChange={(v) => { if (v !== 'x') bulk('category', { categoryId: v }) }}>
            <SelectTrigger className="w-40 h-8 bg-white dark:bg-slate-950"><SelectValue placeholder="انتقال به دسته" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={bulkPricePercent}>تغییر درصدی قیمت</Button>
          {!trashMode && canDelete && <Button size="sm" variant="destructive" onClick={() => bulk('trash')}>حذف گروهی</Button>}
          {trashMode && <Button size="sm" variant="outline" onClick={() => bulk('restore')}>بازگردانی گروهی</Button>}
        </div>
      )}

      {/* items */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-blue-100 dark:border-slate-800"><div className="aspect-square bg-slate-100 dark:bg-slate-900 animate-pulse" /><CardContent className="p-3 space-y-2"><div className="h-4 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" /><div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          {trashMode ? <Trash2 className="w-10 h-10 text-blue-300 mx-auto mb-3" /> : <PackageX className="w-10 h-10 text-blue-300 mx-auto mb-3" />}
          <p className="text-slate-500 dark:text-slate-400">{trashMode ? 'سطل زباله خالی است' : 'محصولی با این فیلترها پیدا نشد'}</p>
          {canManage && !trashMode && (
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus className="w-4 h-4" /> افزودن اولین محصول
            </Button>
          )}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((p) => (
            <div key={p.id} className="relative">
              {canEdit && (
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => setSelected((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })}
                  className="absolute top-2 left-2 z-10 bg-white dark:bg-slate-950"
                  aria-label={`انتخاب ${p.name}`}
                />
              )}
              {productCard(p)}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-blue-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto nice-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit && (
                    <TableHead className="w-10">
                      <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="انتخاب همه" />
                    </TableHead>
                  )}
                  <TableHead>محصول</TableHead>
                  <TableHead className="hidden md:table-cell">دسته</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>موجودی</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const badge = statusBadge(p)
                  return (
                    <TableRow key={p.id}>
                      {canEdit && (
                        <TableCell>
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={() => setSelected((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })}
                            aria-label={`انتخاب ${p.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {p.images[0] ? (
                            <button
                              type="button"
                              className="shrink-0 cursor-zoom-in"
                              onClick={() => setGallery({ p, idx: 0 })}
                              title="نمایش گالری تصاویر"
                              aria-label={`نمایش گالری ${p.name}`}
                            >
                              <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-blue-50" loading="lazy" />
                            </button>
                          ) : (
                            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-900">
                              <Package className="w-4 h-4 text-blue-400" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-52">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">{p.category.name}</TableCell>
                      <TableCell className="text-sm font-semibold text-blue-700 dark:text-blue-300">{faMoney(effectivePrice(p))}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Input
                            type="number"
                            defaultValue={p.stock}
                            className="w-20 h-8"
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (Number.isFinite(v) && v !== p.stock) quickUpdate(p, { stock: v })
                            }}
                            aria-label={`موجودی ${p.name}`}
                          />
                        ) : (
                          <span className="text-sm">{faNumber(p.stock)}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge className={`border-0 ${badge.cls}`}>{badge.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canSell && p.stock > 0 && (
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setSelling(p)} title="ثبت فروش">
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => { setEditing(p); setFormOpen(true) }} title="ویرایش">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {trashMode ? (
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => restore(p)} title="بازگردانی">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            canDelete && (
                              <Button size="icon" variant="outline" className="h-7 w-7 text-red-500" onClick={() => trash(p)} title="حذف">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="صفحه بعد">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-500">صفحه {faNumber(page)} از {faNumber(totalPages)}</span>
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="صفحه قبل">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* dialogs */}
      <ProductFormDialog
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={(changed) => { setFormOpen(false); setEditing(null); if (changed) bumpData() }}
      />
      {selling && (
        <SellDialog
          product={selling}
          onClose={(sold) => { setSelling(null); if (sold) bumpData() }}
        />
      )}
      {adjusting && (
        <StockAdjustDialog
          product={adjusting}
          onClose={(changed) => { setAdjusting(null); if (changed) bumpData() }}
        />
      )}
      {gallery && (
        <ProductGalleryDialog
          productName={gallery.p.name}
          images={gallery.p.images}
          startIndex={gallery.idx}
          onClose={() => setGallery(null)}
        />
      )}
    </div>
  )
}
