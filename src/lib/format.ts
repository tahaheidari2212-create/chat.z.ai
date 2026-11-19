// Shared formatting helpers (safe on both server and client)

export function faNumber(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('fa-IR')
}

export function faMoney(n: number): string {
  return `${faNumber(n)} تومان`
}

export function jalaliDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function jalaliDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function shortJalaliDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('fa-IR', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// YYYY-MM-DD in Asia/Tehran timezone
export function tehranToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())
}

// HH:MM in Asia/Tehran timezone
export function tehranTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function randomSku(prefix = 'SKU'): string {
  const n = Math.floor(Math.random() * 90000) + 10000
  return `${prefix}-${n}`
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشرشده',
  OUT: 'ناموجود',
  ARCHIVED: 'آرشیو',
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر کل',
  ADMIN: 'مدیر',
  STAFF: 'کارمند فروش',
  VIEWER: 'فقط مشاهده',
}

export const NOTE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-300 dark:border-blue-800', label: 'آبی' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-300 dark:border-emerald-800', label: 'سبز' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-300 dark:border-amber-800', label: 'زرد' },
  red: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-300 dark:border-red-800', label: 'قرمز' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950', border: 'border-violet-300 dark:border-violet-800', label: 'بنفش' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-900', border: 'border-gray-300 dark:border-gray-700', label: 'خاکستری' },
}

export function saleEffectivePrice(p: { salePrice: number; discountPrice?: number | null }): number {
  return p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.salePrice
}
