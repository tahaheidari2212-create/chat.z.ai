import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkApiKey, parseIntSafe } from '@/lib/api-helpers'

/**
 * Public REST API (for external bots/services).
 * Auth: header `x-api-key` (the key lives in Settings).
 * GET /api/v1/products?search=&category=&page=&perPage=
 */
export async function GET(req: NextRequest) {
  if (!(await checkApiKey(req))) {
    return NextResponse.json({ error: 'API key نامعتبر است' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const search = sp.get('search')?.trim() || ''
  const categoryId = sp.get('category') || ''
  const page = Math.max(1, parseIntSafe(sp.get('page'), 1))
  const perPage = Math.min(100, Math.max(1, parseIntSafe(sp.get('perPage'), 20)))

  const where: Record<string, unknown> = { deletedAt: null, status: 'PUBLISHED' }
  if (search) where.name = { contains: search }
  if (categoryId) where.categoryId = categoryId

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return NextResponse.json({
    total,
    page,
    perPage,
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category.name,
      categorySlug: p.category.slug,
      brand: p.brand,
      model: p.model,
      price: p.salePrice,
      discountPrice: p.discountPrice,
      stock: p.stock,
      shortDesc: p.shortDesc,
      attributes: JSON.parse(p.attributes || '[]'),
      images: JSON.parse(p.images || '[]'),
      updatedAt: p.updatedAt,
    })),
  })
}
