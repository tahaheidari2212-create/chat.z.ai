import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, fireWebhook, guard, jsonError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await guard('product.view')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!product) return jsonError('محصول یافت نشد', 404)

  const [priceHistory, stockLogs] = await Promise.all([
    db.priceHistory.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.stockLog.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ])

  return NextResponse.json({
    product: {
      ...product,
      images: JSON.parse(product.images || '[]'),
      attributes: JSON.parse(product.attributes || '[]'),
    },
    priceHistory,
    stockLogs,
  })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return jsonError('محصول یافت نشد', 404)

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.slug !== undefined && String(body.slug).trim()) data.slug = String(body.slug).trim()
    if (body.sku !== undefined && String(body.sku).trim()) data.sku = String(body.sku).trim()
    if (body.categoryId !== undefined) data.categoryId = String(body.categoryId)
    if (body.brand !== undefined) data.brand = String(body.brand).trim() || null
    if (body.model !== undefined) data.model = String(body.model).trim() || null
    if (body.salePrice !== undefined) data.salePrice = Math.max(0, parseInt(body.salePrice, 10) || 0)
    if (body.discountPrice !== undefined) {
      data.discountPrice = body.discountPrice ? Math.max(0, parseInt(body.discountPrice, 10) || 0) : null
    }
    if (body.costPrice !== undefined) {
      data.costPrice = body.costPrice ? Math.max(0, parseInt(body.costPrice, 10) || 0) : null
    }
    if (body.stock !== undefined) data.stock = Math.max(0, parseInt(body.stock, 10) || 0)
    if (body.lowStockThreshold !== undefined) {
      data.lowStockThreshold = Math.max(0, parseInt(body.lowStockThreshold, 10) || 0)
    }
    if (body.status !== undefined && ['DRAFT', 'PUBLISHED', 'OUT', 'ARCHIVED'].includes(body.status)) {
      data.status = body.status
    }
    if (body.attributes !== undefined) {
      data.attributes = JSON.stringify(
        Array.isArray(body.attributes)
          ? body.attributes
              .filter((a: { key?: string }) => a && String(a.key || '').trim())
              .map((a: { key: string; value: string }) => ({
                key: String(a.key).trim(),
                value: String(a.value || '').trim(),
              }))
          : []
      )
    }
    if (body.images !== undefined) {
      data.images = JSON.stringify(
        Array.isArray(body.images) ? body.images.map(String).filter((u: string) => u.trim()) : []
      )
    }
    for (const f of ['shortDesc', 'longDesc', 'metaTitle', 'metaDesc'] as const) {
      if (body[f] !== undefined) data[f] = String(body[f]).trim() || null
    }

    const updated = await db.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data })
      // record price history when the selling price changed
      const newPrice = data.salePrice !== undefined ? (data.salePrice as number) : undefined
      if (newPrice !== undefined && newPrice !== existing.salePrice) {
        await tx.priceHistory.create({
          data: { productId: id, oldPrice: existing.salePrice, newPrice, userId: g.user.id },
        })
      }
      // stock log for manual edits (not sale-related)
      const newStock = data.stock !== undefined ? (data.stock as number) : undefined
      if (newStock !== undefined && newStock !== existing.stock) {
        await tx.stockLog.create({
          data: {
            productId: id,
            change: newStock - existing.stock,
            reason: 'MANUAL',
            userId: g.user.id,
          },
        })
        // auto status when stock reaches 0 or returns above 0
        if (newStock === 0 && existing.status === 'PUBLISHED') {
          await tx.product.update({ where: { id }, data: { status: 'OUT' } })
        } else if (newStock > 0 && existing.status === 'OUT') {
          await tx.product.update({ where: { id }, data: { status: 'PUBLISHED' } })
        }
      }
      return product
    })

    await audit(g.user.id, 'product.update', 'product', id, updated.name)
    await fireWebhook('product.updated', { id, name: updated.name })
    return NextResponse.json({ product: updated })
  } catch {
    return jsonError('خطا در ویرایش محصول (اسلاگ یا SKU تکراری؟)', 500)
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = await guard('product.delete')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params
  const hard = req.nextUrl.searchParams.get('hard') === '1'

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return jsonError('محصول یافت نشد', 404)

  if (hard) {
    const saleCount = await db.sale.count({ where: { productId: id } })
    if (saleCount > 0) {
      return jsonError('این محصول سابقه فروش دارد و حذف نهایی ممکن نیست؛ از آرشیو استفاده کنید', 400)
    }
    await db.product.delete({ where: { id } })
    await audit(g.user.id, 'product.hard_delete', 'product', id, existing.name)
    await fireWebhook('product.deleted', { id, name: existing.name })
    return NextResponse.json({ ok: true, hard: true })
  }

  await db.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } })
  await audit(g.user.id, 'product.trash', 'product', id, existing.name)
  await fireWebhook('product.deleted', { id, name: existing.name })
  return NextResponse.json({ ok: true })
}
