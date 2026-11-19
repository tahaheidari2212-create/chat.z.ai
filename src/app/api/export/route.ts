import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard } from '@/lib/api-helpers'
import { STATUS_LABELS, jalaliDateTime } from '@/lib/format'

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) lines.push(row.map(csvEscape).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

export async function GET(req: NextRequest) {
  const g = await guard('export.run')
  if ('resp' in g) return g.resp

  const type = req.nextUrl.searchParams.get('type') || 'products'

  if (type === 'products') {
    const items = await db.product.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    const csv = toCsv(
      ['نام', 'SKU', 'دسته‌بندی', 'برند', 'قیمت فروش', 'قیمت با تخفیف', 'موجودی', 'وضعیت', 'توضیح کوتاه'],
      items.map((p) => [
        p.name, p.sku, p.category.name, p.brand || '', p.salePrice,
        p.discountPrice || '', p.stock, STATUS_LABELS[p.status] || p.status, p.shortDesc || '',
      ])
    )
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products-${Date.now()}.csv"`,
      },
    })
  }

  // sales export
  const items = await db.sale.findMany({
    include: { product: { select: { name: true, sku: true } }, soldBy: { select: { name: true } } },
    orderBy: { soldAt: 'desc' },
  })
  const csv = toCsv(
    ['محصول', 'SKU', 'تعداد', 'قیمت واحد', 'مبلغ کل', 'مشتری', 'زمان فروش', 'ثبت‌کننده', 'لغوشده'],
    items.map((s) => [
      s.product.name, s.product.sku, s.qty, s.unitPrice, s.total,
      s.customerName || '', jalaliDateTime(s.soldAt), s.soldBy?.name || '',
      s.cancelledAt ? 'بله' : 'خیر',
    ])
  )
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-${Date.now()}.csv"`,
    },
  })
}
