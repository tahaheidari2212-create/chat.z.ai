import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  const g = await guard('user.manage')
  if ('resp' in g) return g.resp

  const users = await db.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

/** Super Admin creates accounts directly (no public signup in this deployment). */
export async function POST(req: NextRequest) {
  const g = await guard('user.manage')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const username = String(body.username || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const password = String(body.password || '')
  const role = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'VIEWER'].includes(body.role) ? body.role : 'STAFF'

  if (!username || !name) return jsonError('نام و نام کاربری الزامی است')
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return jsonError('رمز عبور باید حداقل ۸ کاراکتر با ترکیب حروف و عدد باشد')
  }
  if (await db.user.findUnique({ where: { username } })) {
    return jsonError('این نام کاربری قبلاً ثبت شده است')
  }

  const user = await db.user.create({
    data: { username, name, role, passwordHash: hashPassword(password), active: true },
  })
  await audit(g.user.id, 'user.create', 'user', user.id, username)
  return NextResponse.json(
    { user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active } },
    { status: 201 }
  )
}
