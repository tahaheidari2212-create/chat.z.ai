import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { can, getSessionUser, type Role, type SessionUser } from '@/lib/auth'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/** Returns the session user, or an appropriate error response. */
export async function guard(perm?: string): Promise<{ user: SessionUser } | { resp: NextResponse }> {
  const user = await getSessionUser()
  if (!user) return { resp: jsonError('ابتدا وارد شوید', 401) }
  if (perm && !can(user.role, perm)) {
    return { resp: jsonError('شما دسترسی لازم برای این عملیات را ندارید', 403) }
  }
  return { user }
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  try {
    await db.auditLog.create({
      data: { userId: userId || undefined, action, entity, entityId, details },
    })
  } catch {
    // audit log should never break the main flow
  }
}

/** Fire a webhook (best-effort) when products change. */
export async function fireWebhook(event: string, data: unknown) {
  try {
    const setting = await db.setting.findUnique({ where: { id: 'main' } })
    if (!setting?.webhookUrl) return
    await fetch(setting.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Event': event },
      body: JSON.stringify({ event, data, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // webhook failure must not break product operations
  }
}

export async function checkApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get('x-api-key')
  if (!key) return false
  const setting = await db.setting.findUnique({ where: { id: 'main' } })
  return !!setting && setting.apiKey === key
}

export function parseIntSafe(v: string | null, fallback: number): number {
  const n = parseInt(v || '', 10)
  return Number.isFinite(n) ? n : fallback
}
