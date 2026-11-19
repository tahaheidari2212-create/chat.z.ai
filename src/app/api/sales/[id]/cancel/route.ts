import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

/** Cancel a sale: restores stock, keeps the record for history */
export async function POST(req: NextRequest, ctx: Ctx) {
  const g = await guard('sale.cancel')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const sale = await db.sale.findUnique({ where: { id } })
  if (!sale) return jsonError('فروش یافت نشد', 404)
  if (sale.cancelledAt) return jsonError('این فروش قبلاً لغو شده است')

  const body = await req.json()
  const reason = String(body.reason || '').trim()
  if (!reason) return jsonError('ثبت دلیل لغو الزامی است')

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelReason: reason },
    })
    const product = await tx.product.findUnique({ where: { id: sale.productId } })
    if (product) {
      const newStock = product.stock + sale.qty
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: newStock,
          status:
            product.status === 'OUT' && newStock > 0 ? 'PUBLISHED' : product.status,
        },
      })
      await tx.stockLog.create({
        data: { productId: product.id, change: sale.qty, reason: 'SALE_CANCEL', userId: g.user.id },
      })
    }
  })

  await audit(g.user.id, 'sale.cancel', 'sale', id, reason)
  return NextResponse.json({ ok: true })
}
