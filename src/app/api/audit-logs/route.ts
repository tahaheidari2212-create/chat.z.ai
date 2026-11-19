import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard } from '@/lib/api-helpers'

export async function GET() {
  const g = await guard('user.manage')
  if ('resp' in g) return g.resp

  const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 150 })
  return NextResponse.json({ logs })
}
