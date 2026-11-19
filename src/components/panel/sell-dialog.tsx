'use client'

import { useState } from 'react'
import { Loader2, ShoppingCart } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Product } from '@/lib/client-types'
import { faMoney, faNumber } from '@/lib/format'

export function SellDialog({ product, onClose }: { product: Product; onClose: (sold: boolean) => void }) {
  const { toast } = useToast()
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState(String(product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.salePrice))
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const q = Math.max(1, parseInt(qty || '1', 10) || 1)
  const total = (parseInt(unitPrice || '0', 10) || 0) * q

  async function submit() {
    setSaving(true)
    try {
      await api('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          qty: q,
          unitPrice: parseInt(unitPrice, 10),
          customerName,
          note,
        }),
      })
      toast({
        title: 'فروش ثبت شد',
        description: `${product.name} × ${faNumber(q)} — ${faMoney(total)}`,
      })
      onClose(true)
    } catch (err) {
      toast({ title: 'خطا در ثبت فروش', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' })
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            ثبت فروش
          </DialogTitle>
          <DialogDescription>{product.name} — موجودی فعلی: {faNumber(product.stock)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>تعداد</Label>
              <Input type="number" dir="ltr" className="text-left" min={1} max={product.stock} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>قیمت فروش هر واحد (تومان)</Label>
              <Input type="number" dir="ltr" className="text-left" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>نام مشتری (اختیاری)</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>توضیح (اختیاری)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">مبلغ کل</span>
            <span className="font-bold text-blue-700 dark:text-blue-300">{faMoney(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>انصراف</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={saving || q > product.stock || q < 1}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ثبت فروش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
