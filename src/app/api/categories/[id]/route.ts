import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await guard('category.manage')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.icon !== undefined) data.icon = String(body.icon || '') || null
  if (body.parentId !== undefined) data.parentId = body.parentId ? String(body.parentId) : null
  if (body.order !== undefined) data.order = parseInt(body.order, 10) || 0
  if (body.active !== undefined) data.active = Boolean(body.active)

  const category = await db.category.update({ where: { id }, data })
  await audit(g.user.id, 'category.update', 'category', id, category.name)
  return NextResponse.json({ category })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await guard('category.manage')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const productCount = await db.product.count({ where: { categoryId: id, deletedAt: null } })
  if (productCount > 0) {
    return jsonError(`این دسته‌بندی ${productCount} محصول دارد؛ اول محصولات را به دستهٔ دیگری منتقل کنید`, 400)
  }
  const childCount = await db.category.count({ where: { parentId: id } })
  if (childCount > 0) {
    return jsonError('این دسته‌بندی زیرمجموعه دارد؛ اول زیرمجموعه‌ها را حذف یا منتقل کنید', 400)
  }

  const category = await db.category.delete({ where: { id } })
  await audit(g.user.id, 'category.delete', 'category', id, category.name)
  return NextResponse.json({ ok: true })
}
