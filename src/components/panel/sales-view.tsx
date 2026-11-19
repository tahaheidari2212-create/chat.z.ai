'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Ban, Download, Package, Loader2, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'
import { useToast } from '@/hooks/use-toast'
import { usePanel, canDo } from '@/store/panel'
import { SaleInvoiceDialog } from './sale-invoice'
import { api, downloadFile } from '@/lib/api'
import type { Sale } from '@/lib/client-types'
import { faMoney, faNumber, jalaliDateTime } from '@/lib/format'

type SalesResponse = { total: number; page: number; perPage: number; totalAmount: number; items: Sale[] }

export function SalesView() {
  const { dataVersion, session } = usePanel()
  const { toast } = useToast()
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [cancelling, setCancelling] = useState<Sale | null>(null)
  const [invoicing, setInvoicing] = useState<Sale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canCancel = canDo(session?.role, 'sale.cancel')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (search) params.set('search', search)
      setData(await api<SalesResponse>(`/api/sales?${params}`))
    } finally {
      setLoading(false)
    }
  }, [page, from, to, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, dataVersion])

  async function cancelSale() {
    if (!cancelling || !cancelReason.trim()) {
      toast({ title: 'ثبت دلیل لغو الزامی است', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api(`/api/sales/${cancelling.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason }) })
      toast({ title: 'فروش لغو شد', description: 'موجودی محصول برگردانده شد' })
      setCancelling(null)
      setCancelReason('')
      load()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'لغو ناموفق', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">تاریخچهٔ فروش</h1>
          {data && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {faNumber(data.total)} فروش — مجموع: <span className="font-semibold text-blue-700 dark:text-blue-300">{faMoney(data.totalAmount)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => downloadFile('/api/export/excel?type=sales', 'sales.xlsx')
              .catch((e) => toast({ title: 'خطا', description: e instanceof Error ? e.message : 'دانلود ناموفق', variant: 'destructive' }))}
          ><Download className="w-4 h-4" /> خروجی اکسل</Button>
          <Button
            size="sm" variant="outline"
            onClick={() => downloadFile('/api/export?type=sales', 'sales.csv')
              .catch((e) => toast({ title: 'خطا', description: e instanceof Error ? e.message : 'دانلود ناموفق', variant: 'destructive' }))}
          ><Download className="w-4 h-4" /> خروجی CSV</Button>
        </div>
      </div>

      <Card className="border-blue-100 dark:border-slate-800">
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="جستجو در محصول یا مشتری..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pr-9" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500">از</Label>
            <Input type="date" dir="ltr" className="w-36" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
            <Label className="text-sm text-slate-500">تا</Label>
            <Input type="date" dir="ltr" className="w-36" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto nice-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>محصول</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead className="hidden md:table-cell">مشتری</TableHead>
                <TableHead className="hidden md:table-cell">ثبت‌کننده</TableHead>
                <TableHead>زمان</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
              ) : !data || data.items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">فروشی یافت نشد</TableCell></TableRow>
              ) : (
                data.items.map((s) => (
                  <TableRow key={s.id} className={s.cancelledAt ? 'opacity-55' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {s.product.images?.[0] ? (
                          <img src={s.product.images[0]} alt={s.product.name} className="w-9 h-9 rounded-md object-cover bg-blue-50" loading="lazy" />
                        ) : (
                          <span className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 dark:bg-slate-900">
                            <Package className="w-4 h-4 text-blue-400" />
                          </span>
                        )}
                        <span className="font-medium text-sm">{s.product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{faNumber(s.qty)}</TableCell>
                    <TableCell className="font-semibold text-blue-700 dark:text-blue-300">{faMoney(s.total)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500">{s.customerName || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500">{s.soldBy?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">{jalaliDateTime(s.soldAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm" variant="outline" className="h-7 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
                          onClick={() => setInvoicing(s)} title="فاکتور / چاپ"
                        >
                          <ReceiptText className="w-3.5 h-3.5" /> فاکتور
                        </Button>
                        {s.cancelledAt ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" title={s.cancelReason || ''}>
                            لغو شده
                          </Badge>
                        ) : (
                          canCancel && (
                            <Button size="sm" variant="outline" className="h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setCancelling(s)}>
                              <Ban className="w-3.5 h-3.5" /> لغو
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Pagination dir="rtl">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} className={page <= 1 ? 'pointer-events-none opacity-50' : ''} />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm text-slate-500 px-3">صفحه {faNumber(page)} از {faNumber(totalPages)}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)) }} className={page >= totalPages ? 'pointer-events-none opacity-50' : ''} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {cancelling && (
        <Dialog open onOpenChange={(v) => !v && setCancelling(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>لغو فروش</DialogTitle>
              <DialogDescription>
                لغو «{cancelling.product.name} × {faNumber(cancelling.qty)}» — موجودی به‌صورت خودکار برگردانده می‌شود.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <Label>دلیل لغو (الزامی)</Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="مثلاً انصراف مشتری / اشتباه در ثبت" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelling(null)}>انصراف</Button>
              <Button variant="destructive" onClick={cancelSale} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                لغو فروش
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {invoicing && <SaleInvoiceDialog sale={invoicing} onClose={() => setInvoicing(null)} />}
    </div>
  )
}
