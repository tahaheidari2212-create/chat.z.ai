import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, fireWebhook, guard, jsonError } from '@/lib/api-helpers'
import { slugify, randomSku } from '@/lib/format'

function parseAttributes(v: unknown): string {
  if (Array.isArray(v)) {
    return JSON.stringify(
      v
        .filter((a) => a && String(a.key || '').trim())
        .map((a) => ({ key: String(a.key).trim(), value: String(a.value || '').trim() }))
    )
  }
  return '[]'
}

function parseImages(v: unknown): string {
  if (Array.isArray(v)) {
    return JSON.stringify(v.map((u) => String(u)).filter((u) => u.trim()))
  }
  return '[]'
}

export async function GET(req: NextRequest) {
  const g = await guard('product.view')
  if ('resp' in g) return g.resp

  const sp = req.nextUrl.searchParams
  const search = sp.get('search')?.trim() || ''
  const categoryId = sp.get('category') || ''
  const status = sp.get('status') || ''
  const stockFilter = sp.get('stock') || '' // '' | 'in' | 'low' | 'out'
  const minPrice = parseInt(sp.get('minPrice') || '', 10)
  const maxPrice = parseInt(sp.get('maxPrice') || '', 10)
  const sort = sp.get('sort') || 'newest' // newest | priceAsc | priceDesc | stockAsc | stockDesc | name
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get('perPage') || '12', 10)))
  const trash = sp.get('trash') === '1'

  const where: Record<string, unknown> = {
    deletedAt: trash ? { not: null } : null,
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { brand: { contains: search } },
      { model: { contains: search } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = status
  if (Number.isFinite(minPrice)) where.salePrice = { ...(where.salePrice as object || {}), gte: minPrice }
  if (Number.isFinite(maxPrice)) where.salePrice = { ...(where.salePrice as object || {}), lte: maxPrice }
  if (stockFilter === 'out') where.stock = 0
  if (stockFilter === 'in') where.stock = { gt: 0 }
  if (stockFilter === 'low') where.stock = { gt: 0 }

  const orderByMap: Record<string, Record<string, string>> = {
    newest: { createdAt: 'desc' },
    priceAsc: { salePrice: 'asc' },
    priceDesc: { salePrice: 'desc' },
    stockAsc: { stock: 'asc' },
    stockDesc: { stock: 'desc' },
    name: { name: 'asc' },
  }

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: orderByMap[sort] || orderByMap.newest,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  const filtered = stockFilter === 'low'
    ? items.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold)
    : items

  return NextResponse.json({
    total,
    page,
    perPage,
    items: filtered.map((p) => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      attributes: JSON.parse(p.attributes || '[]'),
    })),
  })
}

export async function POST(req: NextRequest) {
  const g = await guard('product.create')
  if ('resp' in g) return g.resp

  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return jsonError('نام محصول الزامی است')
    if (!body.categoryId) return jsonError('انتخاب دسته‌بندی الزامی است')

    let slug = slugify(String(body.slug || name)) || randomSku('P')
    // ensure slug uniqueness
    const exists = await db.product.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`

    let sku = String(body.sku || '').trim() || randomSku()
    const skuExists = await db.product.findUnique({ where: { sku } })
    if (skuExists) sku = randomSku()

    const product = await db.product.create({
      data: {
        name,
        slug,
        sku,
        categoryId: String(body.categoryId),
        brand: String(body.brand || '').trim() || null,
        model: String(body.model || '').trim() || null,
        salePrice: Math.max(0, parseInt(body.salePrice || 0, 10) || 0),
        discountPrice: body.discountPrice ? Math.max(0, parseInt(body.discountPrice, 10) || 0) : null,
        costPrice: body.costPrice ? Math.max(0, parseInt(body.costPrice, 10) || 0) : null,
        stock: Math.max(0, parseInt(body.stock || 0, 10) || 0),
        lowStockThreshold: Math.max(0, parseInt(body.lowStockThreshold || 3, 10) || 3),
        status: ['DRAFT', 'PUBLISHED', 'OUT', 'ARCHIVED'].includes(body.status) ? body.status : 'PUBLISHED',
        attributes: parseAttributes(body.attributes),
        images: parseImages(body.images),
        shortDesc: String(body.shortDesc || '').trim() || null,
        longDesc: String(body.longDesc || '').trim() || null,
        metaTitle: String(body.metaTitle || '').trim() || null,
        metaDesc: String(body.metaDesc || '').trim() || null,
        createdBy: g.user.id,
      },
    })

    if (product.stock > 0) {
      await db.stockLog.create({
        data: { productId: product.id, change: product.stock, reason: 'MANUAL', userId: g.user.id },
      })
    }
    await audit(g.user.id, 'product.create', 'product', product.id, product.name)
    await fireWebhook('product.created', { id: product.id, name: product.name, sku: product.sku })

    return NextResponse.json({ product }, { status: 201 })
  } catch {
    return jsonError('خطا در ساخت محصول', 500)
  }
}
