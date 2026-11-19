import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard } from '@/lib/api-helpers'

export async function GET() {
  const g = await guard('report.view')
  if ('resp' in g) return g.resp

  let setting = await db.setting.findUnique({ where: { id: 'main' } })
  if (!setting) {
    setting = await db.setting.create({
      data: {
        id: 'main',
        apiKey: crypto.randomUUID().replace(/-/g, ''),
        storeName: 'فروشگاه موبایل',
      },
    })
  }
  // API key only revealed to users who can manage settings
  const includeKey = g.user.role === 'SUPER_ADMIN' || g.user.role === 'ADMIN'
  const maskKey = (k: string | null) =>
    k ? (k.length > 10 ? `${k.slice(0, 6)}${'•'.repeat(8)}${k.slice(-4)}` : '•'.repeat(8)) : ''
  return NextResponse.json({
    setting: {
      storeName: setting.storeName,
      reminderEnabled: setting.reminderEnabled,
      reminderHour: setting.reminderHour,
      reminderMinute: setting.reminderMinute,
      webhookUrl: setting.webhookUrl,
      currency: setting.currency,
      geminiConfigured: Boolean(setting.geminiKey || process.env.GEMINI_API_KEY),
      geminiMasked: maskKey(setting.geminiKey),
      aiProvider: setting.aiProvider,
      geminiProxyUrl: setting.geminiProxyUrl || '',
      updatedAt: setting.updatedAt,
      ...(includeKey ? { apiKey: setting.apiKey } : {}),
    },
  })
}

export async function PUT(req: NextRequest) {
  const g = await guard('settings.manage')
  if ('resp' in g) return g.resp

  const body = await req.json()
  const current = await db.setting.findUnique({ where: { id: 'main' } })
  if (!current) return NextResponse.json({ error: 'تنظیمات یافت نشد' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.storeName !== undefined) data.storeName = String(body.storeName).trim() || current.storeName
  if (body.reminderEnabled !== undefined) data.reminderEnabled = Boolean(body.reminderEnabled)
  if (body.reminderHour !== undefined) {
    data.reminderHour = Math.min(23, Math.max(0, parseInt(body.reminderHour, 10) || 0))
  }
  if (body.reminderMinute !== undefined) {
    data.reminderMinute = Math.min(59, Math.max(0, parseInt(body.reminderMinute, 10) || 0))
  }
  if (body.webhookUrl !== undefined) data.webhookUrl = String(body.webhookUrl).trim() || null
  if (body.currency !== undefined && ['TOMAN', 'RIAL'].includes(body.currency)) data.currency = body.currency
  if (body.geminiKey !== undefined) {
    const key = String(body.geminiKey).trim()
    // skip masked/unchanged values, empty clears the key
    // both AIza API keys and AQ. OAuth tokens are accepted — Google authenticates both via key=
    if (!key) data.geminiKey = null
    else if (!key.includes('•')) data.geminiKey = key
  }
  if (body.aiProvider !== undefined) {
    data.aiProvider = ['zai', 'gemini'].includes(body.aiProvider) ? body.aiProvider : 'zai'
  }
  if (body.geminiProxyUrl !== undefined) {
    data.geminiProxyUrl = String(body.geminiProxyUrl).trim() || null
  }
  if (body.regenerateApiKey) data.apiKey = crypto.randomUUID().replace(/-/g, '')

  const setting = await db.setting.update({ where: { id: 'main' }, data })
  await audit(g.user.id, 'settings.update', 'setting', 'main')
  return NextResponse.json({
    setting: {
      storeName: setting.storeName,
      reminderEnabled: setting.reminderEnabled,
      reminderHour: setting.reminderHour,
      reminderMinute: setting.reminderMinute,
      webhookUrl: setting.webhookUrl,
      currency: setting.currency,
      geminiConfigured: Boolean(setting.geminiKey || process.env.GEMINI_API_KEY),
      aiProvider: setting.aiProvider,
      geminiProxyUrl: setting.geminiProxyUrl || '',
      apiKey: setting.apiKey,
    },
  })
}
