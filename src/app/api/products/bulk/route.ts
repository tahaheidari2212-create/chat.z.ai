import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

/** Bulk operations on selected products: trash, restore, status, category, percent price change */
export async function POST(req: NextRequest) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  const action = String(body.action || '')
  if (ids.length === 0) return jsonError('هیچ محصولی انتخاب نشده است')

  switch (action) {
    case 'trash':
      await db.product.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), status: 'ARCHIVED' } })
      await audit(g.user.id, 'product.bulk_trash', 'product', undefined, `${ids.length} items`)
      break
    case 'restore':
      await db.product.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } })
      break
    case 'status':
      if (!['DRAFT', 'PUBLISHED', 'OUT', 'ARCHIVED'].includes(body.status)) {
        return jsonError('وضعیت نامعتبر است')
      }
      await db.product.updateMany({ where: { id: { in: ids } }, data: { status: body.status } })
      break
    case 'category':
      if (!body.categoryId) return jsonError('دسته‌بندی انتخاب نشده است')
      await db.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: String(body.categoryId) } })
      break
    case 'pricePercent': {
      const pct = parseInt(body.percent, 10)
      if (!Number.isFinite(pct) || pct === 0) return jsonError('درصد تغییر نامعتبر است')
      const products = await db.product.findMany({ where: { id: { in: ids } } })
      for (const p of products) {
        const newPrice = Math.max(0, Math.round((p.salePrice * (100 + pct)) / 100))
        await db.$transaction([
          db.product.update({ where: { id: p.id }, data: { salePrice: newPrice } }),
          db.priceHistory.create({
            data: { productId: p.id, oldPrice: p.salePrice, newPrice, userId: g.user.id },
          }),
        ])
      }
      await audit(g.user.id, 'product.bulk_price_percent', 'product', undefined, `${pct}% on ${ids.length}`)
      break
    }
    default:
      return jsonError('عملیات نامعتبر است')
  }

  return NextResponse.json({ ok: true, count: ids.length })
}
