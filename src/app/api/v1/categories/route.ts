import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkApiKey } from '@/lib/api-helpers'

/** Public REST API for categories (x-api-key). */
export async function GET(req: NextRequest) {
  if (!(await checkApiKey(req))) {
    return NextResponse.json({ error: 'API key نامعتبر است' }, { status: 401 })
  }

  const categories = await db.category.findMany({
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({
    items: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parent: c.parentId,
      icon: c.icon,
      productCount: c._count.products,
    })),
  })
}
