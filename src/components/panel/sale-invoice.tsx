'use client'

import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePanel } from '@/store/panel'
import { faMoney, faNumber, jalaliDateTime } from '@/lib/format'
import type { Sale } from '@/lib/client-types'

/** Print-friendly sale invoice. Print CSS isolates .invoice-print so only it lands on paper. */
export function SaleInvoiceDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { storeName } = usePanel()
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const handler = () => setPrinting(false)
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [])

  if (!sale) return null
  const invoiceNo = `INV-${sale.id.slice(-8).toUpperCase()}`
  const cancelled = Boolean(sale.cancelledAt)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0 print:border-0 print:shadow-none print:max-w-[210mm]" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 print:hidden z-10"
          aria-label="بستن فاکتور"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="invoice-print bg-white text-slate-800 p-6 sm:p-8" dir="rtl">
          {/* header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-blue-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white text-lg font-black shrink-0">ب</span>
              <div>
                <p className="font-bold text-base leading-6">{storeName}</p>
                <p className="text-xs text-slate-400">پنل مدیریت فروشگاه موبایل</p>
              </div>
            </div>
            <div className="text-left">
              <p className="font-bold text-blue-700 text-lg">فاکتور فروش</p>
              <p className="text-xs text-slate-400 font-mono" dir="ltr">{invoiceNo}</p>
              <p className="text-xs text-slate-500 mt-1">{jalaliDateTime(sale.soldAt)}</p>
            </div>
          </div>

          {/* parties */}
          <div className="grid grid-cols-2 gap-3 py-4 text-sm">
            <div className="rounded-lg bg-blue-50/70 px-3 py-2.5">
              <p className="text-[11px] text-slate-400 mb-0.5">مشتری</p>
              <p className="font-medium">{sale.customerName || 'مشتری مدنظر'}</p>
            </div>
            <div className="rounded-lg bg-blue-50/70 px-3 py-2.5">
              <p className="text-[11px] text-slate-400 mb-0.5">فروشنده</p>
              <p className="font-medium">{sale.soldBy?.name || '—'}</p>
            </div>
          </div>

          {/* items */}
          <table className="w-full text-sm border-collapse" dir="rtl">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="py-2 px-3 text-right rounded-r-md">کالا</th>
                <th className="py-2 px-2 text-center hidden sm:table-cell">کد</th>
                <th className="py-2 px-2 text-center">تعداد</th>
                <th className="py-2 px-2 text-center">قیمت واحد</th>
                <th className="py-2 px-3 text-center rounded-l-md">مبلغ کل</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 px-3 font-medium">{sale.product.name}</td>
                <td className="py-2.5 px-2 text-center text-xs text-slate-400 font-mono hidden sm:table-cell" dir="ltr">{sale.product.sku}</td>
                <td className="py-2.5 px-2 text-center">{faNumber(sale.qty)}</td>
                <td className="py-2.5 px-2 text-center">{faMoney(sale.unitPrice)}</td>
                <td className="py-2.5 px-3 text-center font-bold text-blue-700">{faMoney(sale.total)}</td>
              </tr>
              {cancelled && (
                <tr>
                  <td colSpan={5} className="py-2 px-3">
                    <span className="inline-block rounded-md bg-red-50 text-red-600 text-xs font-medium px-2 py-1">
                      این فاکتور لغو شده است{sale.cancelReason ? ` — دلیل: ${sale.cancelReason}` : ''}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full sm:w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>قیمت واحد × تعداد</span>
                <span>{faMoney(sale.unitPrice)} × {faNumber(sale.qty)}</span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-blue-600 pt-2 mt-2">
                <span className="font-bold">مبلغ قابل پرداخت</span>
                <span className="font-black text-blue-700 text-lg">{faMoney(sale.total)}</span>
              </div>
            </div>
          </div>

          {sale.note && (
            <p className="mt-3 text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2">یادداشت: {sale.note}</p>
          )}

          {/* footer */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>با تشکر از اعتماد شما</span>
            <span>چاپ‌شده در {jalaliDateTime(new Date().toISOString())}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-blue-100 dark:border-slate-800 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>بستن</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setPrinting(true); setTimeout(() => window.print(), 60) }}>
            <Printer className="w-4 h-4" /> چاپ / ذخیره PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
