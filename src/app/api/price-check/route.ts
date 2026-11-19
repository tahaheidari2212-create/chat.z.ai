import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard } from '@/lib/api-helpers'
import { tehranToday } from '@/lib/format'

/** Status of today's price check (for the dashboard alert + reminder modal). */
export async function GET() {
  const g = await guard('product.view')
  if ('resp' in g) return g.resp

  const today = await db.priceCheck.findUnique({ where: { date: tehranToday() } })
  return NextResponse.json({ checked: !!today, status: today?.status || null, date: tehranToday() })
}

/** Record the daily answer: «تغییری نکرده» or «بله، ویرایش می‌کنم» */
export async function POST(req: NextRequest) {
  const g = await guard('product.update')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const status = ['CONFIRMED', 'EDITED'].includes(body.status) ? body.status : 'CONFIRMED'
  const today = tehranToday()

  await db.priceCheck.upsert({
    where: { date: today },
    update: { status, userId: g.user.id },
    create: { date: today, status, userId: g.user.id },
  })
  await audit(g.user.id, 'price.check', 'price_check', today, status)
  return NextResponse.json({ ok: true, date: today, status })
}
