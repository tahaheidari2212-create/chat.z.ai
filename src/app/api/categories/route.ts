import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { slugify } from '@/lib/format'

export async function GET() {
  const g = await guard('category.view')
  if ('resp' in g) return g.resp

  const categories = await db.category.findMany({
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const g = await guard('category.manage')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return jsonError('نام دسته‌بندی الزامی است')

  let slug = slugify(String(body.slug || name)) || `cat-${Date.now()}`
  if (await db.category.findUnique({ where: { slug } })) slug = `${slug}-${Date.now()}`

  const category = await db.category.create({
    data: {
      name,
      slug,
      icon: String(body.icon || '') || null,
      parentId: body.parentId ? String(body.parentId) : null,
      order: parseInt(body.order || 0, 10) || 0,
      active: body.active !== false,
    },
  })
  await audit(g.user.id, 'category.create', 'category', category.id, category.name)
  return NextResponse.json({ category }, { status: 201 })
}
