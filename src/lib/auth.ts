import crypto from 'crypto'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'VIEWER'

const SECRET = process.env.AUTH_SECRET || 'shop-panel-local-dev-secret'
const COOKIE_NAME = 'shop_session'

// ---------- password hashing (scrypt, no external deps) ----------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = crypto.scryptSync(password, salt, 64)
  const target = Buffer.from(hash, 'hex')
  if (target.length !== test.length) return false
  return crypto.timingSafeEqual(target, test)
}

// ---------- token (HMAC-signed, JWT-like) ----------

type TokenPayload = { uid: string; role: Role; exp: number }

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function signToken(uid: string, role: Role, days = 1): string {
  const payload: TokenPayload = {
    uid,
    role,
    exp: Date.now() + days * 24 * 60 * 60 * 1000,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${hmac(body)}`
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = hmac(body)
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ---------- session ----------

export type SessionUser = {
  id: string
  username: string
  name: string
  role: Role
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    // 1) Authorization: Bearer header (works inside cross-origin preview iframes where cookies are blocked)
    let token: string | undefined
    try {
      const h = await headers()
      const auth = h.get('authorization')
      if (auth?.toLowerCase().startsWith('bearer ')) token = auth.slice(7).trim() || undefined
    } catch { /* headers() unavailable outside request scope */ }
    // 2) fallback: session cookie
    if (!token) {
      const store = await cookies()
      token = store.get(COOKIE_NAME)?.value
    }
    if (!token) return null
    const payload = verifyToken(token)
    if (!payload) return null
    const user = await db.user.findUnique({ where: { id: payload.uid } })
    if (!user || !user.active) return null
    return { id: user.id, username: user.username, name: user.name, role: user.role as Role }
  } catch {
    return null
  }
}

export async function setSessionCookie(uid: string, role: Role, remember: boolean) {
  const store = await cookies()
  const days = remember ? 30 : 1
  // SameSite=None + Secure when served over https (preview proxy) so the cookie
  // also survives cross-origin iframe embedding; Bearer token is the primary mechanism.
  let isHttps = false
  try {
    const h = await headers()
    isHttps = (h.get('x-forwarded-proto') || '').includes('https')
  } catch { /* ignore */ }
  store.set(COOKIE_NAME, signToken(uid, role, days), {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: days * 24 * 60 * 60,
    secure: isHttps,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

// ---------- RBAC ----------

type Perm = string // e.g. 'product.create', 'sale.cancel', '*'

const ROLE_PERMISSIONS: Record<Role, Perm[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'product.*', 'category.*', 'sale.*', 'note.*',
    'report.view', 'settings.manage', 'reminder.manage', 'export.run', 'import.run',
  ],
  STAFF: ['product.view', 'category.view', 'sale.create', 'note.*', 'report.view'],
  VIEWER: ['product.view', 'category.view', 'report.view'],
}

export function can(role: Role, perm: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || []
  if (perms.includes('*')) return true
  if (perms.includes(perm)) return true
  const [domain] = perm.split('.')
  return perms.includes(`${domain}.*`)
}

export async function requirePerm(perm: string): Promise<SessionUser | null> {
  const user = await getSessionUser()
  if (!user) return null
  if (!can(user.role, perm)) return null
  return user
}

// ---------- login rate limiting (in-memory) ----------

type Attempt = { count: number; lockedUntil: number }
const attempts = new Map<string, Attempt>()

export function checkRateLimit(key: string): { ok: boolean; lockedMinutes?: number } {
  const a = attempts.get(key)
  if (!a) return { ok: true }
  if (a.lockedUntil > Date.now()) {
    return { ok: false, lockedMinutes: Math.ceil((a.lockedUntil - Date.now()) / 60000) }
  }
  return { ok: true }
}

export function registerFailure(key: string): { locked: boolean; lockedMinutes?: number } {
  const a = attempts.get(key) || { count: 0, lockedUntil: 0 }
  a.count += 1
  if (a.count >= 5) {
    a.lockedUntil = Date.now() + 15 * 60 * 1000
    a.count = 0
    attempts.set(key, a)
    return { locked: true, lockedMinutes: 15 }
  }
  attempts.set(key, a)
  return { locked: false }
}

export function resetFailures(key: string) {
  attempts.delete(key)
}
