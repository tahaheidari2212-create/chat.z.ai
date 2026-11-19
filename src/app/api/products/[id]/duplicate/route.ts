import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { randomSku } from '@/lib/format'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: Ctx) {
  const g = await guard('product.create')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const p = await db.product.findUnique({ where: { id } })
  if (!p) return jsonError('محصول یافت نشد', 404)

  let slug = `${p.slug}-copy`
  let n = 2
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${p.slug}-copy-${n}`
    n += 1
  }
  let sku = `${p.sku}-C${Math.floor(Math.random() * 900 + 100)}`
  while (await db.product.findUnique({ where: { sku } })) {
    sku = randomSku()
  }

  const copy = await db.product.create({
    data: {
      name: `${p.name} (کپی)`,
      slug,
      sku,
      categoryId: p.categoryId,
      brand: p.brand,
      model: p.model,
      salePrice: p.salePrice,
      discountPrice: p.discountPrice,
      costPrice: p.costPrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      status: p.status === 'PUBLISHED' ? 'DRAFT' : p.status,
      attributes: p.attributes,
      images: p.images,
      shortDesc: p.shortDesc,
      longDesc: p.longDesc,
      metaTitle: p.metaTitle,
      metaDesc: p.metaDesc,
      createdBy: g.user.id,
    },
  })

  await audit(g.user.id, 'product.duplicate', 'product', copy.id, copy.name)
  return NextResponse.json({ product: copy }, { status: 201 })
}
