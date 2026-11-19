import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { tehranToday } from '@/lib/format'

/** Save all prices from the quick-edit table (one save → price history per product). */
export async function POST(req: NextRequest) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const updates: { id: string; newPrice: number }[] = Array.isArray(body.updates) ? body.updates : []
  if (updates.length === 0) return jsonError('هیچ قیمتی برای ذخیره وجود ندارد')

  let changed = 0
  for (const u of updates) {
    const p = await db.product.findUnique({ where: { id: u.id } })
    if (!p) continue
    const newPrice = Math.max(0, parseInt(String(u.newPrice), 10) || 0)
    if (newPrice === p.salePrice) continue
    await db.$transaction([
      db.product.update({ where: { id: p.id }, data: { salePrice: newPrice } }),
      db.priceHistory.create({
        data: { productId: p.id, oldPrice: p.salePrice, newPrice, userId: g.user.id },
      }),
    ])
    changed += 1
  }

  if (changed > 0) {
    // mark today's price check as EDITED
    await db.priceCheck.upsert({
      where: { date: tehranToday() },
      update: { status: 'EDITED', userId: g.user.id },
      create: { date: tehranToday(), status: 'EDITED', userId: g.user.id },
    })
  }

  await audit(g.user.id, 'price.bulk_update', 'product', undefined, `${changed} products updated`)
  return NextResponse.json({ ok: true, changed })
}
