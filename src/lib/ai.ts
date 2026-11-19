import { db } from '@/lib/db'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
/** Google deprecated gemini-2.5-flash for new users (404) — the API recommends gemini-3.8-flash. */
const MODEL = 'gemini-3.8-flash'

export type AiProvider = 'zai' | 'gemini'
export type GeminiTurn = { role: 'user' | 'model'; content: string }

export type AiConfig = {
  provider: AiProvider
  geminiKey: string
  proxyUrl: string
}

export async function getAiConfig(): Promise<AiConfig> {
  const setting = await db.setting.findUnique({ where: { id: 'main' } })
  const provider: AiProvider = setting?.aiProvider === 'gemini' ? 'gemini' : 'zai'
  const envKey = process.env.GEMINI_API_KEY
  const geminiKey = setting?.geminiKey || (envKey ? String(envKey) : '') || ''
  const proxyUrl = setting?.geminiProxyUrl?.trim() || process.env.GEMINI_PROXY?.trim() || ''
  return { provider, geminiKey, proxyUrl }
}

/** Keep for callers that only care about the raw Gemini key. */
export async function getGeminiKey(): Promise<string | null> {
  const cfg = await getAiConfig()
  return cfg.geminiKey || null
}

export type AiGenerateOpts = { system?: string; history?: GeminiTurn[]; json?: boolean; maxTokens?: number }

/** Single entry point used by all AI routes: dispatches to the configured engine. */
export async function generateAiText(prompt: string, opts?: AiGenerateOpts): Promise<string> {
  const cfg = await getAiConfig()
  if (cfg.provider === 'gemini') {
    if (!cfg.geminiKey) {
      throw new Error('کلید Gemini تنظیم نشده است؛ از تنظیمات اضافه کنید یا موتور داخلی «z.ai» را انتخاب کنید')
    }
    return geminiGenerate(cfg.geminiKey, prompt, opts, cfg.proxyUrl)
  }
  return zaiGenerate(prompt, opts)
}

/** Internal z.ai engine — works inside the z.ai environment; elsewhere a readable error is thrown. */
async function zaiGenerate(prompt: string, opts?: AiGenerateOpts): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  let zai
  try {
    zai = await ZAI.create()
  } catch {
    throw new Error('موتور داخلی z.ai فقط در محیط z.ai در دسترس است؛ در تنظیمات موتور «Gemini» را انتخاب و کلید رایگان آن را وارد کنید (aistudio.google.com)')
  }

  const system = opts?.system
    ? opts.json
      ? `${opts.system}\nپاسخ را فقط به‌صورت یک شیء JSON معتبر بده، بدون هیچ متن اضافه.`
      : opts.system
    : undefined

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  if (system) messages.push({ role: 'assistant', content: system })
  for (const h of opts?.history || []) {
    messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })
  }
  messages.push({ role: 'user', content: prompt })

  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  })
  const text = completion.choices?.[0]?.message?.content || ''
  if (!text.trim()) throw new Error('پاسخی از موتور هوش مصنوعی دریافت نشد')
  return text.trim()
}

/** Low-level Gemini call. Throws with readable Persian errors. */
export async function geminiGenerate(
  key: string,
  prompt: string,
  opts?: AiGenerateOpts,
  proxyUrl?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [
      ...(opts?.history || []).map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: opts?.maxTokens ?? 1200,
      ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
    },
  }
  if (opts?.system) body.systemInstruction = { parts: [{ text: opts.system }] }

  let res: Response
  try {
    const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`
    if (proxyUrl) {
      // Reach the API through a user-provided proxy (undici supports CONNECT proxies)
      const { fetch: undiciFetch, ProxyAgent } = await import('undici')
      res = await undiciFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        dispatcher: new ProxyAgent(proxyUrl),
        signal: AbortSignal.timeout(45_000),
      }) as unknown as Response
    } else {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      })
    }
  } catch {
    throw new Error('اتصال به سرویس هوش مصنوعی برقرار نشد (شبکه یا زمان انتظار)')
  }

  if (res.status === 400 || res.status === 403) {
    const detail = await res
      .json()
      .catch(() => null)
      .then((d: { error?: { message?: string } } | null) => d?.error?.message || '')
    if (/location is not supported/i.test(detail)) {
      throw new Error('گوگل API گمنی را از موقعیت مکانی این سرور اجازه نمی‌دهد (از ایران و برخی مناطق مسدود است). موتور داخلی «z.ai» را در تنظیمات انتخاب کن، یا آدرس یک پروکسی خارج از این مناطق را در تنظیمات وارد کن.')
    }
    if (/no longer available/i.test(detail)) {
      throw new Error('این مدل گمنی برای حساب شما در دسترس نیست؛ مدل پیش‌فرض پنل به‌روزرسانی شده — صفحه را رفرش کنید.')
    }
    throw new Error('کلید API نامعتبر است یا دسترسی ندارد. کلید را از aistudio.google.com/app/apikey بگیر (با AIza شروع می‌شود) و در تنظیمات جایگزین کن')
  }
  if (res.status === 429) {
    throw new Error('محدودیت نرخ درخواست؛ چند لحظه بعد دوباره تلاش کنید')
  }
  if (!res.ok) {
    throw new Error(`خطای سرویس هوش مصنوعی (کد ${res.status})`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>
    promptFeedback?: { blockReason?: string }
  }
  if (data.promptFeedback?.blockReason) {
    throw new Error('درخواست توسط فیلتر ایمنی رد شد')
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  if (!text.trim()) throw new Error('پاسخی از هوش مصنوعی دریافت نشد')
  return text.trim()
}

/** Back-compat helper: generate with Gemini using the stored key. */
export async function geminiGenerateOrThrow(
  prompt: string,
  opts?: AiGenerateOpts,
): Promise<string> {
  const cfg = await getAiConfig()
  if (!cfg.geminiKey) throw new Error('کلید Gemini تنظیم نشده است؛ از تنظیمات اضافه کنید')
  return geminiGenerate(cfg.geminiKey, prompt, opts, cfg.proxyUrl)
}
