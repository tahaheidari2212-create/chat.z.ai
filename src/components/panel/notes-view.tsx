'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pin, Search, StickyNote, Pencil, Trash2, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { api } from '@/lib/api'
import type { Note, Product } from '@/lib/client-types'
import { NOTE_COLORS, jalaliDateTime, faNumber } from '@/lib/format'

export function NotesView() {
  const { dataVersion, bumpData, session } = usePanel()
  const { toast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Note | null>(null)
  const [dlgOpen, setDlgOpen] = useState(false)

  const canManage = canDo(session?.role, 'note.create')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await api<{ notes: Note[] }>(`/api/notes${params}`)
      setNotes(res.notes)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, dataVersion])

  async function togglePin(n: Note) {
    try {
      await api(`/api/notes/${n.id}`, { method: 'PATCH', body: JSON.stringify({ pinned: !n.pinned }) })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  async function remove(n: Note) {
    if (!window.confirm(`یادداشت «${n.title}» حذف شود؟`)) return
    try {
      await api(`/api/notes/${n.id}`, { method: 'DELETE' })
      toast({ title: 'یادداشت حذف شد' })
      bumpData()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">یادداشت‌ها</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{faNumber(notes.length)} یادداشت</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-48" />
          </div>
          {canManage && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setDlgOpen(true) }}>
              <Plus className="w-4 h-4" /> یادداشت جدید
            </Button>
          )}
        </div>
      </div>

      {loading && notes.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4 h-32"><div className="h-4 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" /></CardContent></Card>)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <StickyNote className="w-10 h-10 text-blue-300 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">یادداشتی پیدا نشد</p>
          {canManage && (
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setDlgOpen(true) }}>
              <Plus className="w-4 h-4" /> اولین یادداشت
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => {
            const color = NOTE_COLORS[n.color] || NOTE_COLORS.blue
            return (
              <Card key={n.id} className={`${color.bg} ${color.border} border transition-shadow hover:shadow-md`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                      {n.pinned && <Pin className="w-3.5 h-3.5 text-blue-600 shrink-0 fill-blue-600" />}
                      <span className="truncate">{n.title}</span>
                    </p>
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => togglePin(n)} className="p-1 rounded hover:bg-white/60 dark:hover:bg-slate-800" title={n.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'} aria-label="سنجاق">
                        <Pin className={`w-3.5 h-3.5 ${n.pinned ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                      </button>
                      {canManage && (
                        <>
                          <button onClick={() => { setEditing(n); setDlgOpen(true) }} className="p-1 rounded hover:bg-white/60 dark:hover:bg-slate-800" aria-label="ویرایش">
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button onClick={() => remove(n)} className="p-1 rounded hover:bg-white/60 dark:hover:bg-slate-800" aria-label="حذف">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap line-clamp-5 min-h-16">{n.body}</p>
                  {n.product && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] bg-white/70 dark:bg-slate-950/60 rounded px-2 py-0.5 text-blue-700 dark:text-blue-300">
                      <Package className="w-3 h-3" /> {n.product.name}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">{jalaliDateTime(n.updatedAt)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {dlgOpen && (
        <NoteDialog
          editing={editing}
          onClose={() => setDlgOpen(false)}
          onSaved={() => { setDlgOpen(false); bumpData() }}
        />
      )}
    </div>
  )
}

function NoteDialog({ editing, onClose, onSaved }: { editing: Note | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [title, setTitle] = useState(editing?.title || '')
  const [body, setBody] = useState(editing?.body || '')
  const [color, setColor] = useState(editing?.color || 'blue')
  const [pinned, setPinned] = useState(editing?.pinned || false)
  const [productId, setProductId] = useState(editing?.productId || 'none')
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ items: Product[] }>('/api/products?perPage=100').then((r) => setProducts(r.items)).catch(() => {})
  }, [])

  async function save() {
    if (!title.trim()) { toast({ title: 'عنوان الزامی است', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = { title, body, color, pinned, productId: productId === 'none' ? null : productId }
      if (editing) {
        await api(`/api/notes/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        toast({ title: 'یادداشت ویرایش شد' })
      } else {
        await api('/api/notes', { method: 'POST', body: JSON.stringify(payload) })
        toast({ title: 'یادداشت ساخته شد' })
      }
      onSaved()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ذخیره ناموفق', variant: 'destructive' })
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'ویرایش یادداشت' : 'یادداشت جدید'}</DialogTitle>
          <DialogDescription>یادداشت‌ها به‌صورت پیش‌فرض فقط برای شما نمایش داده می‌شوند</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>عنوان *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>متن</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>رنگ</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_COLORS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اتصال به محصول</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون اتصال</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>سنجاق شده (بالا نمایش داده شود)</Label>
            <Switch checked={pinned} onCheckedChange={setPinned} />
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
