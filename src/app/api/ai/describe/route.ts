import { NextRequest, NextResponse } from 'next/server'
import { guard } from '@/lib/api-helpers'
import { generateAiText } from '@/lib/ai'

/** Generate a detailed Persian product description (short + long) with the configured AI engine. Requires product.create rights. */
export async function POST(req: NextRequest) {
  const g = await guard('product.create')
  if ('resp' in g) return g.resp

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const brand = String(body.brand || '').trim()
  const model = String(body.model || '').trim()
  const category = String(body.category || '').trim()
  const attrs: Record<string, string> = body.attrs && typeof body.attrs === 'object' ? body.attrs : {}

  if (!name) return NextResponse.json({ error: 'نام محصول لازم است' }, { status: 400 })

  const attrLines = Object.entries(attrs)
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const prompt = [
    'یک توضیح کامل، دقیق و حرفه‌ای فروشگاهی برای محصول زیر به زبان فارسی روان بنویس.',
    `نام محصول: ${name}`,
    brand ? `برند/مارک: ${brand}` : '',
    model ? `مدل: ${model}` : '',
    category ? `دسته‌بندی: ${category}` : '',
    attrLines ? `مشخصات رسمی (فقط از این‌ها استفاده کن):\n${attrLines}` : '',
    '',
    'خروجی را دقیقاً در این قالب بده و هیچ متن اضافه‌ای قبل یا بعد آن ننویس:',
    'خط اول با «خلاصه: » شروع شود: یک جملهٔ معرفی کوتاه و جذاب (حداکثر ۲۰ کلمه).',
    'سپس یک خط فقط شامل ===',
    'سپس توضیح کامل در ۲ تا ۳ پاراگراف پیوسته (مجموعاً ۱۲۰ تا ۱۸۰ کلمه) با این ساختار:',
    '- پاراگراف ۱: معرفی دقیق محصول؛ نوع محصول را از نام و دسته‌بندی تشخیص بده (گوشی، گلس، قاب، هندزفری، اداپتور، کابل، پاوربانک و هر لوازم جانبی دیگر) و سازگاری/اندازه را دقیقاً همان‌طور که در نام آمده بنویس.',
    '- پاراگراف ۲: ویژگی‌ها و کیفیت ساخت فقط بر اساس مشخصات رسمی داده‌شده؛ اگر مشخصه‌ای داده نشده، فقط ویژگی‌های عمومی و امنِ همان نوع محصول را بگو (بدون ابعاد، استاندارد، شماره گارانتی یا جزئیات ساختگی).',
    '- پاراگراف ۳: مزایای واقعی استفاده در زندگی روزمره و پایان با یک جملهٔ کوتاه دعوت به خرید.',
    '',
    'قوانین دقت:',
    '- هیچ قیمت، آمار، گارانتی، استاندارد یا مشخصه‌ای که داده نشده را از خودت نساز.',
    '- سازگاری محصول باید دقیقاً با نام داده‌شده یکی باشد؛ مدل دیگری پیشنهاد نکن.',
    '- بدون تیتر، بدون بولت، بدون مارک‌داون؛ فقط متن پاراگراف‌ها.',
    '- اعداد داخل متن با ارقام فارسی نوشته شوند.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const text = (await generateAiText(prompt, { maxTokens: 1000 })).trim()

    // Parse the "خلاصه: ... === long" contract; tolerate stray whitespace and missing separator
    let description = text
    let short = ''
    const summary = text.match(/^\s*خلاصه[:：]\s*(.+?)\s*$/m)
    const sep = text.match(/^\s*[=\-*]{3,}\s*$/m)
    if (summary) short = summary[1]
    if (sep) {
      description = text.slice((sep.index ?? 0) + sep[0].length).trim()
    } else if (summary) {
      description = text.replace(summary[0], '').trim()
    }
    // never leak a residual "خلاصه:" line into the long text
    description = description.replace(/^\s*خلاصه[:：].*$/m, '').trim()

    return NextResponse.json({ description, short: short || undefined })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'تولید توضیح ناموفق بود' },
      { status: 400 },
    )
  }
}
