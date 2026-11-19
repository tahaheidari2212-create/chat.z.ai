import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

/** Manual stock adjustment (new shipment, damage, correction) with mandatory reason */
export async function POST(req: NextRequest) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const productId = String(body.productId || '')
  const change = parseInt(body.change, 10)
  const reason = String(body.reason || '').trim()

  if (!Number.isFinite(change) || change === 0) return jsonError('مقدار تغییر نامعتبر است')
  if (!reason) return jsonError('ثبت دلیل تغییر موجودی الزامی است')

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return jsonError('محصول یافت نشد', 404)

  const newStock = Math.max(0, product.stock + change)
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
        status: newStock === 0 && product.status === 'PUBLISHED' ? 'OUT' : product.status,
      },
    })
    await tx.stockLog.create({
      data: { productId, change: newStock - product.stock, reason: `MANUAL: ${reason}`, userId: g.user.id },
    })
  })

  await audit(g.user.id, 'stock.adjust', 'product', productId, `${change > 0 ? '+' : ''}${change} - ${reason}`)
  return NextResponse.json({ ok: true, stock: newStock })
}
