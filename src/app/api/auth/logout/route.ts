import { NextResponse } from 'next/server'
import { clearSessionCookie, getSessionUser } from '@/lib/auth'
import { audit } from '@/lib/api-helpers'

export async function POST() {
  const user = await getSessionUser()
  await clearSessionCookie()
  if (user) await audit(user.id, 'auth.logout', 'user', user.id)
  return NextResponse.json({ ok: true })
}
