import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { db } from '@/lib/db'
import { guard } from '@/lib/api-helpers'
import { STATUS_LABELS, jalaliDateTime } from '@/lib/format'

const BLUE = 'FF2563EB'
const LIGHT = 'FFEFF6FF'

function styleSheet(ws: ExcelJS.Worksheet, widths: number[]) {
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }]
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } }
  })
  header.height = 24
  ws.eachRow((row, i) => {
    if (i === 1) return
    row.alignment = { vertical: 'middle' }
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
      })
    }
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: widths.length } }
}

export async function GET(req: NextRequest) {
  const g = await guard('export.run')
  if ('resp' in g) return g.resp

  const type = req.nextUrl.searchParams.get('type') || 'products'
  const wb = new ExcelJS.Workbook()
  wb.creator = 'پنل فروشگاه موبایل'
  wb.created = new Date()

  if (type === 'products') {
    const items = await db.product.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    const ws = wb.addWorksheet('محصولات')
    ws.addRow(['نام', 'SKU', 'دسته‌بندی', 'برند', 'قیمت فروش', 'قیمت با تخفیف', 'موجودی', 'وضعیت', 'توضیح کوتاه'])
    for (const p of items) {
      ws.addRow([
        p.name, p.sku, p.category.name, p.brand || '', p.salePrice,
        p.discountPrice || '', p.stock, STATUS_LABELS[p.status] || p.status, p.shortDesc || '',
      ])
    }
    ws.getColumn(5).numFmt = '#,##0'
    ws.getColumn(6).numFmt = '#,##0'
    styleSheet(ws, [26, 14, 16, 14, 14, 15, 10, 12, 40])
  } else {
    const items = await db.sale.findMany({
      include: { product: { select: { name: true, sku: true } }, soldBy: { select: { name: true } } },
      orderBy: { soldAt: 'desc' },
    })
    const ws = wb.addWorksheet('فروش‌ها')
    ws.addRow(['محصول', 'SKU', 'تعداد', 'قیمت واحد', 'مبلغ کل', 'مشتری', 'زمان فروش', 'ثبت‌کننده', 'لغوشده'])
    for (const s of items) {
      ws.addRow([
        s.product.name, s.product.sku, s.qty, s.unitPrice, s.total,
        s.customerName || '', jalaliDateTime(s.soldAt), s.soldBy?.name || '',
        s.cancelledAt ? 'بله' : 'خیر',
      ])
    }
    ws.getColumn(4).numFmt = '#,##0'
    ws.getColumn(5).numFmt = '#,##0'
    styleSheet(ws, [26, 14, 8, 14, 16, 18, 20, 16, 9])
  }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-${Date.now()}.xlsx"`,
    },
  })
}
