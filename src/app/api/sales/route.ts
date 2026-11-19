import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { saleEffectivePrice } from '@/lib/format'

export async function GET(req: NextRequest) {
  const g = await guard('report.view')
  if ('resp' in g) return g.resp

  const sp = req.nextUrl.searchParams
  const from = sp.get('from')
  const to = sp.get('to')
  const search = sp.get('search')?.trim() || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get('perPage') || '20', 10)))

  const where: Record<string, unknown> = {}
  if (from || to) {
    where.soldAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    }
  }
  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { product: { name: { contains: search } } },
    ]
  }

  const [total, items, agg] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      include: { product: { select: { name: true, sku: true, images: true } }, soldBy: { select: { name: true } } },
      orderBy: { soldAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.sale.aggregate({ where, _sum: { total: true } }),
  ])

  return NextResponse.json({
    total,
    page,
    perPage,
    totalAmount: agg._sum.total || 0,
    items: items.map((s) => ({
      ...s,
      product: {
        ...s.product,
        images: JSON.parse(s.product.images || '[]'),
      },
    })),
  })
}

/** Register a sale: decrement stock automatically, snapshot the price */
export async function POST(req: NextRequest) {
  const g = await guard('sale.create')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const productId = String(body.productId || '')
  const qty = Math.max(1, parseInt(body.qty || 1, 10) || 1)

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || product.deletedAt) return jsonError('محصول یافت نشد', 404)
  if (product.status === 'DRAFT' || product.status === 'ARCHIVED') {
    return jsonError('این محصول منتشر نشده است')
  }
  if (product.stock < qty) {
    return jsonError(`موجودی کافی نیست (موجودی فعلی: ${product.stock})`)
  }

  const unitPrice =
    body.unitPrice !== undefined && body.unitPrice !== null && String(body.unitPrice) !== ''
      ? Math.max(0, parseInt(body.unitPrice, 10) || 0)
      : saleEffectivePrice(product)

  const sale = await db.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        productId,
        qty,
        unitPrice,
        total: unitPrice * qty,
        customerName: String(body.customerName || '').trim() || null,
        note: String(body.note || '').trim() || null,
        soldById: g.user.id,
        ...(body.soldAt ? { soldAt: new Date(body.soldAt) } : {}),
      },
    })
    const newStock = product.stock - qty
    await tx.product.update({
      where: { id: productId },
      data: { stock: newStock, status: newStock === 0 ? 'OUT' : product.status },
    })
    await tx.stockLog.create({
      data: { productId, change: -qty, reason: 'SALE', userId: g.user.id },
    })
    return created
  })

  await audit(g.user.id, 'sale.create', 'sale', sale.id, `${product.name} x${qty}`)
  return NextResponse.json({ sale }, { status: 201 })
}
