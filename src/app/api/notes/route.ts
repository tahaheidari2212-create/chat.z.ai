import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const g = await guard('note.view')
  if ('resp' in g) return g.resp

  const search = req.nextUrl.searchParams.get('search')?.trim() || ''
  const where: Record<string, unknown> = search
    ? { OR: [{ title: { contains: search } }, { body: { contains: search } }] }
    : {}

  const notes = await db.note.findMany({
    where,
    include: { product: { select: { name: true } } },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
  })
  return NextResponse.json({ notes })
}

export async function POST(req: NextRequest) {
  const g = await guard('note.create')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const title = String(body.title || '').trim()
  if (!title) return jsonError('عنوان یادداشت الزامی است')

  const note = await db.note.create({
    data: {
      title,
      body: String(body.body || ''),
      color: ['blue', 'green', 'amber', 'red', 'violet', 'gray'].includes(body.color) ? body.color : 'blue',
      pinned: Boolean(body.pinned),
      productId: body.productId ? String(body.productId) : null,
      userId: g.user.id,
    },
  })
  await audit(g.user.id, 'note.create', 'note', note.id, title)
  return NextResponse.json({ note }, { status: 201 })
}
