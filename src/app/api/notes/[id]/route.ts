import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await guard('note.update')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.body !== undefined) data.body = String(body.body)
  if (body.color !== undefined && ['blue', 'green', 'amber', 'red', 'violet', 'gray'].includes(body.color)) {
    data.color = body.color
  }
  if (body.pinned !== undefined) data.pinned = Boolean(body.pinned)
  if (body.productId !== undefined) data.productId = body.productId ? String(body.productId) : null

  const note = await db.note.update({ where: { id }, data })
  await audit(g.user.id, 'note.update', 'note', id, note.title)
  return NextResponse.json({ note })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await guard('note.delete')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const note = await db.note.delete({ where: { id } })
  await audit(g.user.id, 'note.delete', 'note', id, note.title)
  return NextResponse.json({ ok: true })
}
