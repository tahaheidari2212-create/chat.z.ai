'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Product } from '@/lib/client-types'
import { faNumber } from '@/lib/format'

export function StockAdjustDialog({ product, onClose }: { product: Product; onClose: (changed: boolean) => void }) {
  const { toast } = useToast()
  const [change, setChange] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const amount = Math.abs(parseInt(change || '0', 10) || 0)
  const delta = direction === 'in' ? amount : -amount
  const newStock = Math.max(0, product.stock + delta)

  async function submit() {
    if (amount <= 0) {
      toast({ title: 'مقدار را وارد کنید', variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: 'ثبت دلیل الزامی است', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/stock', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, change: delta, reason }),
      })
      toast({ title: 'موجودی تغییر کرد', description: `${product.name}: ${faNumber(product.stock)} ← ${faNumber(newStock)}` })
      onClose(true)
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تغییر دستی موجودی</DialogTitle>
          <DialogDescription>
            {product.name} — موجودی فعلی: {faNumber(product.stock)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>نوع تغییر</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'in' | 'out')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">ورود کالا (+)</SelectItem>
                  <SelectItem value="out">خروج/خرابی (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مقدار</Label>
              <Input type="number" dir="ltr" className="text-left" min={1} value={change} onChange={(e) => setChange(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>دلیل (الزامی — در لاگ موجودی ثبت می‌شود)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً ورود محموله جدید / خرابی در انتقال" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            موجودی جدید: <span className="font-bold text-blue-700 dark:text-blue-300">{faNumber(newStock)}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ثبت تغییر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
