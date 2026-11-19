'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, Trash2, ImagePlus, Loader2, Sparkles, Star } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Category, Product, ProductAttr } from '@/lib/client-types'
import { faNumber, randomSku, slugify } from '@/lib/format'

type FormState = {
  name: string
  slug: string
  sku: string
  categoryId: string
  brand: string
  model: string
  salePrice: string
  discountPrice: string
  costPrice: string
  stock: string
  lowStockThreshold: string
  status: Product['status']
  attributes: ProductAttr[]
  images: string[]
  shortDesc: string
  longDesc: string
  metaTitle: string
  metaDesc: string
}

function emptyForm(): FormState {
  return {
    name: '', slug: '', sku: '', categoryId: '', brand: '', model: '',
    salePrice: '', discountPrice: '', costPrice: '', stock: '0', lowStockThreshold: '3',
    status: 'PUBLISHED', attributes: [{ key: '', value: '' }], images: [],
    shortDesc: '', longDesc: '', metaTitle: '', metaDesc: '',
  }
}

function fromProduct(p: Product): FormState {
  return {
    name: p.name, slug: p.slug, sku: p.sku, categoryId: p.categoryId,
    brand: p.brand || '', model: p.model || '',
    salePrice: String(p.salePrice), discountPrice: p.discountPrice ? String(p.discountPrice) : '',
    costPrice: p.costPrice ? String(p.costPrice) : '',
    stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold),
    status: p.status, attributes: p.attributes.length ? [...p.attributes] : [{ key: '', value: '' }],
    images: [...p.images], shortDesc: p.shortDesc || '', longDesc: p.longDesc || '',
    metaTitle: p.metaTitle || '', metaDesc: p.metaDesc || '',
  }
}

export function ProductFormDialog({
  open, product, categories, onClose,
}: {
  open: boolean
  product: Product | null
  categories: Category[]
  onClose: (changed: boolean) => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [aiLoading, setAiLoading] = useState(false)

  async function generateAiDescription() {
    if (!form.name.trim()) {
      toast({ title: 'اول نام محصول را وارد کنید', variant: 'destructive' })
      return
    }
    setAiLoading(true)
    try {
      const cat = categories.find((c) => c.id === form.categoryId)
      const attrs: Record<string, string> = {}
      for (const a of form.attributes) {
        if (a.key.trim() && a.value.trim()) attrs[a.key.trim()] = a.value.trim()
      }
      const res = await api<{ description: string; short?: string }>('/api/ai/describe', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          brand: form.brand.trim(),
          model: form.model.trim(),
          category: cat?.name || '',
          attrs,
        }),
      })
      const text = res.description
      const firstSentence = text.split(/[.!؟?\n]/)[0].trim()
      const short = (res.short || firstSentence).trim()
      set({
        longDesc: text,
        shortDesc: form.shortDesc.trim() || short.slice(0, 140),
        metaDesc: form.metaDesc.trim() || short.slice(0, 150),
      })
      toast({ title: 'توضیح کامل با هوش مصنوعی ساخته شد' })
    } catch (err) {
      toast({
        title: 'تولید توضیح ناموفق',
        description: err instanceof Error ? err.message : 'دوباره تلاش کنید',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const parentCats = categories.filter((c) => !c.parentId)
  const allCats = [
    ...parentCats.map((c) => ({ id: c.id, label: c.name })),
    ...categories
      .filter((c) => c.parentId)
      .map((c) => ({ id: c.id, label: `— ${c.name}` })),
  ]

  useEffect(() => {
    if (!open) return
    setForm(product ? fromProduct(product) : emptyForm())
    if (!product) {
      setForm((f) => ({ ...f, sku: randomSku() }))
    }
  }, [open, product])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  async function uploadFiles(files: FileList) {
    const list = Array.from(files)
    if (!list.length) return
    setUploading(true)
    try {
      const results = await Promise.allSettled(
        list.map(async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await api<{ url: string }>('/api/uploads', { method: 'POST', body: fd })
          return res.url
        }),
      )
      const urls = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
      const failed = results.length - urls.length
      if (urls.length) setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
      if (failed) {
        toast({ title: 'برخی فایل‌ها آپلود نشدند', description: `${faNumber(failed)} فایل ناموفق بود`, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'خطا در آپلود', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    if (!form.name.trim()) { toast({ title: 'نام محصول الزامی است', variant: 'destructive' }); return }
    if (!form.categoryId) { toast({ title: 'دسته‌بندی را انتخاب کنید', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        salePrice: parseInt(form.salePrice || '0', 10) || 0,
        discountPrice: form.discountPrice ? parseInt(form.discountPrice, 10) : null,
        costPrice: form.costPrice ? parseInt(form.costPrice, 10) : null,
        stock: parseInt(form.stock || '0', 10) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold || '3', 10) || 3,
        attributes: form.attributes.filter((a) => a.key.trim()),
      }
      if (product) {
        await api(`/api/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        toast({ title: 'محصول ویرایش شد', description: form.name })
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) })
        toast({ title: 'محصول ساخته شد', description: form.name })
      }
      onClose(true)
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle>{product ? 'ویرایش محصول' : 'محصول جدید'}</DialogTitle>
          <DialogDescription>فیلدهای ستاره‌دار الزامی هستند</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">اطلاعات اصلی</TabsTrigger>
            <TabsTrigger value="media">تصاویر و ویژگی‌ها</TabsTrigger>
            <TabsTrigger value="extra">توضیحات و سئو</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>نام محصول *</Label>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً گوشی iPhone 15 Pro Max" />
              </div>
              <div className="space-y-2">
                <Label>دسته‌بندی *</Label>
                <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {allCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>وضعیت</Label>
                <Select value={form.status} onValueChange={(v) => set({ status: v as Product['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">منتشرشده</SelectItem>
                    <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                    <SelectItem value="OUT">ناموجود</SelectItem>
                    <SelectItem value="ARCHIVED">آرشیو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اسلاگ (خودکار اگر خالی باشد)</Label>
                <Input dir="ltr" className="text-left" value={form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="iphone-15-pro-max" />
              </div>
              <div className="space-y-2">
                <Label>کد محصول (SKU)</Label>
                <Input dir="ltr" className="text-left" value={form.sku} onChange={(e) => set({ sku: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>برند</Label>
                <Input value={form.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Apple" />
              </div>
              <div className="space-y-2">
                <Label>مدل</Label>
                <Input value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="iPhone 15 Pro Max" />
              </div>
              <div className="space-y-2">
                <Label>قیمت فروش (تومان) *</Label>
                <Input type="number" dir="ltr" className="text-left" value={form.salePrice} onChange={(e) => set({ salePrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>قیمت با تخفیف (اختیاری)</Label>
                <Input type="number" dir="ltr" className="text-left" value={form.discountPrice} onChange={(e) => set({ discountPrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>قیمت خرید (برای محاسبه سود — اختیاری)</Label>
                <Input type="number" dir="ltr" className="text-left" value={form.costPrice} onChange={(e) => set({ costPrice: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>موجودی</Label>
                  <Input type="number" dir="ltr" className="text-left" value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>آستانه هشدار</Label>
                  <Input type="number" dir="ltr" className="text-left" value={form.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label>تصاویر محصول (بدون محدودیت تعداد — JPG/PNG/WebP تا ۵MB)</Label>
              <p className="text-xs text-slate-400">عکسِ اصلی همان است که در کارت محصول نمایش داده می‌شود؛ با دکمهٔ ستاره روی هر عکس، آن را عکس اصلی کن.</p>
              <div
                className="border-2 border-dashed border-blue-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /> در حال آپلود...</div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-sm text-slate-500">
                    <ImagePlus className="w-6 h-6 text-blue-400" />
                    فایل را اینجا رها کنید یا کلیک کنید
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  dir="ltr"
                  className="text-left flex-1"
                  placeholder="یا آدرس تصویر (URL) را وارد کنید"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!imageUrl.trim()) return
                    setForm((f) => ({ ...f, images: [...f.images, imageUrl.trim()] }))
                    setImageUrl('')
                  }}
                >
                  افزودن
                </Button>
              </div>
              {form.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2 max-h-72 overflow-y-auto nice-scroll p-1">
                  {form.images.map((img, i) => {
                    const isMain = i === 0
                    return (
                      <div
                        key={`${img}-${i}`}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          isMain
                            ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                            : 'border-blue-100 dark:border-slate-800'
                        }`}
                      >
                        <img src={img} alt={`تصویر ${i + 1}`} className="w-full h-full object-cover" />
                        {isMain ? (
                          <span className="absolute bottom-1 right-1 flex items-center gap-0.5 text-[10px] bg-blue-600 text-white rounded px-1.5 py-0.5">
                            <Star className="w-2.5 h-2.5" /> اصلی
                          </span>
                        ) : null}
                        <div className="absolute top-1 left-1 flex gap-1">
                          {!isMain && (
                            <button
                              type="button"
                              className="bg-white/95 dark:bg-slate-900/95 text-blue-600 dark:text-blue-400 rounded p-1 shadow hover:bg-white dark:hover:bg-slate-800 transition-colors"
                              onClick={() => setForm((f) => {
                                const imgs = [...f.images]
                                const [picked] = imgs.splice(i, 1)
                                imgs.unshift(picked)
                                return { ...f, images: imgs }
                              })}
                              title="تنظیم به عنوان عکس اصلی"
                              aria-label="تنظیم به عنوان عکس اصلی"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="bg-red-500 text-white rounded p-1 shadow hover:bg-red-600 transition-colors"
                            onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                            title="حذف تصویر"
                            aria-label="حذف تصویر"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ویژگی‌ها (کلید/مقدار)</Label>
                <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => set({ attributes: [...form.attributes, { key: '', value: '' }] })}>
                  <Plus className="w-3.5 h-3.5" /> ویژگی جدید
                </Button>
              </div>
              <div className="space-y-2">
                {form.attributes.map((attr, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      className="flex-1"
                      placeholder="مثلاً رنگ"
                      value={attr.key}
                      onChange={(e) => set({ attributes: form.attributes.map((a, j) => (j === i ? { ...a, key: e.target.value } : a)) })}
                    />
                    <Input
                      className="flex-1"
                      placeholder="مثلاً تیتانیوم طبیعی"
                      value={attr.value}
                      onChange={(e) => set({ attributes: form.attributes.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)) })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 shrink-0"
                      onClick={() => set({ attributes: form.attributes.filter((_, j) => j !== i) })}
                      aria-label="حذف ویژگی"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">برای گوشی: رنگ، حافظه، گارانتی، وضعیت (آکبند/کارکرده)، IMEI</p>
            </div>
          </TabsContent>

          <TabsContent value="extra" className="space-y-4 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>توضیح کوتاه</Label>
                <Button
                  type="button" size="sm" variant="outline"
                  className="h-7 text-xs border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={generateAiDescription} disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiLoading ? 'در حال تولید…' : 'تولید با هوش مصنوعی'}
                </Button>
              </div>
              <Input value={form.shortDesc} onChange={(e) => set({ shortDesc: e.target.value })} placeholder="یک جمله معرفی" />
            </div>
            <div className="space-y-2">
              <Label>توضیح کامل</Label>
              <Textarea rows={5} value={form.longDesc} onChange={(e) => set({ longDesc: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان متا (سئو)</Label>
                <Input value={form.metaTitle} onChange={(e) => set({ metaTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>توضیح متا (سئو)</Label>
                <Input value={form.metaDesc} onChange={(e) => set({ metaDesc: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-blue-100 dark:border-slate-800 px-3 py-2.5">
              <div>
                <Label className="text-sm">فقط مدیران می‌توانند این محصول را حذف کنند</Label>
                <p className="text-xs text-slate-400">محصولات منتشرشده در فروشگاه و API عمومی نمایش داده می‌شوند</p>
              </div>
              <Switch checked={form.status === 'PUBLISHED'} onCheckedChange={(v) => set({ status: v ? 'PUBLISHED' : 'DRAFT' })} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onClose(false)}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {product ? 'ذخیره تغییرات' : 'ساخت محصول'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
