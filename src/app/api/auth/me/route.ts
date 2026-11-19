import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ user: null })

  const setting = await db.setting.findUnique({ where: { id: 'main' } })
  return NextResponse.json({
    user,
    storeName: setting?.storeName || 'فروشگاه موبایل',
    reminder: setting
      ? { enabled: setting.reminderEnabled, hour: setting.reminderHour, minute: setting.reminderMinute }
      : null,
  })
}
