import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: Ctx) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return jsonError('محصول یافت نشد', 404)

  await db.product.update({
    where: { id },
    data: { deletedAt: null, status: product.stock === 0 ? 'OUT' : 'PUBLISHED' },
  })
  await audit(g.user.id, 'product.restore', 'product', id, product.name)
  return NextResponse.json({ ok: true })
}
