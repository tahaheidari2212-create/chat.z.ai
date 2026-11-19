import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await guard('user.manage')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  const body = await req.json()
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return jsonError('کاربر یافت نشد', 404)

  const data: Record<string, unknown> = {}

  if (body.role !== undefined) {
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF', 'VIEWER'].includes(body.role)) {
      return jsonError('نقش نامعتبر است')
    }
    if (target.id === g.user.id && body.role !== 'SUPER_ADMIN') {
      return jsonError('نمی‌توانید نقش خودتان را پایین بیاورید')
    }
    data.role = body.role
  }
  if (body.active !== undefined) {
    if (target.id === g.user.id && body.active === false) {
      return jsonError('نمی‌توانید حساب خودتان را غیرفعال کنید')
    }
    data.active = Boolean(body.active)
  }
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.password) {
    const pw = String(body.password)
    if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      return jsonError('رمز عبور باید حداقل ۸ کاراکتر با ترکیب حروف و عدد باشد')
    }
    data.passwordHash = hashPassword(pw)
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, active: true },
  })
  await audit(g.user.id, 'user.update', 'user', id, JSON.stringify({ ...data, passwordHash: undefined }))
  return NextResponse.json({ user })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await guard('user.manage')
  if ('resp' in g) return g.resp
  const { id } = await ctx.params

  if (id === g.user.id) return jsonError('نمی‌توانید حساب خودتان را حذف کنید')
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return jsonError('کاربر یافت نشد', 404)
  if (target.role === 'SUPER_ADMIN') return jsonError('حذف مدیر کل امکان‌پذیر نیست')

  await db.user.update({ where: { id }, data: { active: false } })
  await audit(g.user.id, 'user.disable', 'user', id, target.username)
  return NextResponse.json({ ok: true })
}
