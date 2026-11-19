import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard } from '@/lib/api-helpers'
import { tehranToday } from '@/lib/format'

export async function GET(req: NextRequest) {
  const g = await guard('report.view')
  if ('resp' in g) return g.resp

  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '30', 10)))
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000)
  const todayStart = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(now) + 'T00:00:00')

  const saleWhere = (from: Date, to?: Date) => ({
    soldAt: { gte: from, ...(to ? { lte: to } : {}) },
    cancelledAt: null,
  })

  const [
    todaySales,
    weekSales,
    monthSales,
    periodSales,
    prevPeriodSales,
    productsCount,
    lowStockProducts,
    outStockProducts,
    allSalesInPeriod,
    topProducts,
    categoryShares,
    recentSales,
    priceCheckToday,
    noImageCount,
    noPriceCount,
    latestNotes,
  ] = await Promise.all([
    db.sale.aggregate({ where: saleWhere(todayStart), _count: true, _sum: { total: true } }),
    db.sale.aggregate({ where: saleWhere(new Date(now.getTime() - 7 * 864e5)), _count: true, _sum: { total: true } }),
    db.sale.aggregate({ where: saleWhere(new Date(now.getTime() - 30 * 864e5)), _count: true, _sum: { total: true } }),
    db.sale.aggregate({ where: saleWhere(start), _count: true, _sum: { total: true } }),
    db.sale.aggregate({ where: saleWhere(prevStart, start), _count: true, _sum: { total: true } }),
    db.product.count({ where: { deletedAt: null } }),
    db.product.findMany({
      where: { deletedAt: null, stock: { gt: 0 } },
      orderBy: { stock: 'asc' },
      take: 5,
    }),
    db.product.count({ where: { deletedAt: null, stock: 0 } }),
    db.sale.findMany({
      where: saleWhere(start),
      select: { soldAt: true, total: true, qty: true },
    }),
    db.sale.groupBy({
      by: ['productId'],
      where: saleWhere(start),
      _sum: { qty: true, total: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    }),
    db.sale.groupBy({
      by: ['productId'],
      where: saleWhere(start),
      _count: true,
    }),
    db.sale.findMany({
      where: saleWhere(start),
      include: {
        product: { select: { name: true, images: true } },
        soldBy: { select: { name: true } },
      },
      orderBy: { soldAt: 'desc' },
      take: 8,
    }),
    db.priceCheck.findUnique({ where: { date: tehranToday() } }),
    db.product.count({ where: { deletedAt: null, images: '[]' } }),
    db.product.count({ where: { deletedAt: null, salePrice: 0 } }),
    db.note.findMany({ orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }], take: 4 }),
  ])

  // daily trend buckets
  const buckets = new Map<string, { count: number; amount: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 864e5)
    buckets.set(new Intl.DateTimeFormat('en-CA').format(d), { count: 0, amount: 0 })
  }
  for (const s of allSalesInPeriod) {
    const key = new Intl.DateTimeFormat('en-CA').format(s.soldAt)
    const b = buckets.get(key)
    if (b) {
      b.count += 1
      b.amount += s.total
    }
  }
  const trend = Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }))

  // top products with names
  const topIds = topProducts.map((t) => t.productId)
  const topProductDocs = await db.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true },
  })
  const catByProduct = await db.product.findMany({
    where: { id: { in: categoryShares.map((c) => c.productId) } },
    select: { id: true, categoryId: true },
  })
  const catIds = Array.from(new Set(catByProduct.map((c) => c.categoryId)))
  const cats = await db.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
  const catCountMap = new Map<string, number>()
  for (const c of categoryShares) {
    const p = catByProduct.find((x) => x.id === c.productId)
    if (p) catCountMap.set(p.categoryId, (catCountMap.get(p.categoryId) || 0) + c._count)
  }

  const lowStock = lowStockProducts.filter((p) => p.stock <= p.lowStockThreshold)

  const prevCount = prevPeriodSales._count
  const curCount = periodSales._count
  const growth = prevCount > 0 ? Math.round(((curCount - prevCount) / prevCount) * 100) : null

  return NextResponse.json({
    kpis: {
      today: { count: todaySales._count, amount: todaySales._sum.total || 0 },
      week: { count: weekSales._count, amount: weekSales._sum.total || 0 },
      month: { count: monthSales._count, amount: monthSales._sum.total || 0 },
      period: { count: curCount, amount: periodSales._sum.total || 0 },
      growth,
      productsCount,
      lowStockCount: lowStock.length,
      outStockCount: outStockProducts,
    },
    trend,
    topProducts: topProducts.map((t) => ({
      name: topProductDocs.find((p) => p.id === t.productId)?.name || 'محصول حذف‌شده',
      qty: t._sum.qty || 0,
      amount: t._sum.total || 0,
    })),
    categoryShares: Array.from(catCountMap.entries()).map(([id, count]) => ({
      name: cats.find((c) => c.id === id)?.name || 'سایر',
      count,
    })),
    recentSales: recentSales.map((s) => ({
      ...s,
      product: { ...s.product, images: JSON.parse(s.product.images || '[]') },
    })),
    alerts: {
      lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.lowStockThreshold })),
      noImageCount,
      noPriceCount,
      priceCheckedToday: !!priceCheckToday,
    },
    notes: latestNotes,
  })
}
