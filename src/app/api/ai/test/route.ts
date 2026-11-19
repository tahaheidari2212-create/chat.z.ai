import { NextResponse } from 'next/server'
import { guard } from '@/lib/api-helpers'
import { generateAiText, getAiConfig, type AiProvider } from '@/lib/ai'

const PROVIDER_LABEL: Record<AiProvider, string> = {
  zai: 'موتور داخلی z.ai',
  gemini: 'Gemini',
}

/** Connectivity check for the configured AI engine, used by the settings page. */
export async function POST() {
  const g = await guard('report.view')
  if ('resp' in g) return g.resp

  try {
    const { provider } = await getAiConfig()
    const reply = await generateAiText('فقط کلمه «سلام» را بنویس.', { maxTokens: 16 })
    return NextResponse.json({ ok: true, reply, provider, providerLabel: PROVIDER_LABEL[provider] })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'تست اتصال ناموفق بود' },
      { status: 400 },
    )
  }
}
