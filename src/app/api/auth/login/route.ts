import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  checkRateLimit,
  registerFailure,
  resetFailures,
  setSessionCookie,
  signToken,
  verifyPassword,
  type Role,
} from '@/lib/auth'
import { audit } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const remember = Boolean(body.remember)

    if (!username || !password) {
      return NextResponse.json({ error: 'نام کاربری و رمز عبور الزامی است' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for') || 'local'
    const userAgent = req.headers.get('user-agent') || ''
    const rl = checkRateLimit(`${ip}:${username}`)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. ${rl.lockedMinutes} دقیقه بعد دوباره امتحان کنید.` },
        { status: 429 }
      )
    }

    const user = await db.user.findUnique({ where: { username } })
    const ok = !!user && user.active && verifyPassword(password, user.passwordHash)

    await db.loginLog.create({
      data: { username, success: ok, ip, userAgent },
    })

    if (!user || !ok) {
      const fail = registerFailure(`${ip}:${username}`)
      await audit(user?.id || null, 'auth.login_failed', 'user', undefined, username)
      return NextResponse.json(
        {
          error: fail.locked
            ? `حساب به دلیل ۵ تلاش ناموفق، ${fail.lockedMinutes} دقیقه قفل شد`
            : 'نام کاربری یا رمز عبور اشتباه است',
        },
        { status: 401 }
      )
    }

    resetFailures(`${ip}:${username}`)
    await setSessionCookie(user.id, user.role as Role, remember)
    await audit(user.id, 'auth.login', 'user', user.id, user.username)

    // token for Authorization: Bearer — primary session mechanism inside
    // cross-origin preview iframes where third-party cookies are blocked
    const days = remember ? 30 : 1
    const token = signToken(user.id, user.role as Role, days)

    return NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      token,
    })
  } catch {
    return NextResponse.json({ error: 'خطا در پردازش درخواست' }, { status: 500 })
  }
}
