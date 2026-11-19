import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard } from '@/lib/api-helpers'
import { generateAiText, type GeminiTurn } from '@/lib/ai'
import { can } from '@/lib/auth'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

/** Words that never help product lookup (question/connector words). */
const STOPWORDS = new Set([
  'درباره', 'دربارهٔ', 'راجع', 'بگو', 'بگوصد', 'توضیح', 'توضیحات', 'بده', 'بدید', 'چیه', 'چیست', 'چه', 'کیه', 'کدام',
  'قیمت', 'قیمتش', 'موجود', 'موجودی', 'هست', 'هستش', 'است', 'بود', 'از', 'به', 'با', 'و', 'در', 'که', 'را', 'رو',
  'یه', 'یک', 'برای', 'میخوام', 'میخواهم', 'میخای', 'کن', 'کنه', 'بکن', 'برام', 'میشه', 'باشه', 'خب', 'چطور',
  'چگونه', 'چند', 'چقدر', 'ایا', 'آیا', 'لطفا', 'لطفاً', 'هم', 'همه', 'های', 'هایی', 'ها', 'روی', 'ازش', 'بهش',
  'این', 'اون', 'نظرت', 'میکنی', 'میکن', 'کارت', 'please', 'the', 'a', 'an', 'of', 'to', 'for', 'is', 'are',
  'what', 'how', 'about', 'tell', 'me', 'its', 'and',
])

/** Normalize a chat message for product search: unify digits/letters, then tokenize. */
function extractSearchTokens(message: string): string[] {
  const normalized = message
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[.,،؛;:!؟?()"'«»\[\]{}\-–—]/g, ' ')
    .replace(/\u200c/g, ' ')
  const raw = normalized.split(/\s+/).filter(Boolean)
  const tokens: string[] = []
  for (const w of raw) {
    const t = w.replace(/(هایی|های|ها|s)$/i, '')
    if (t.length < 2 || STOPWORDS.has(w) || STOPWORDS.has(t) || /^\d{1,2}$/.test(t)) continue
    if (!tokens.includes(t)) tokens.push(t)
    if (tokens.length >= 8) break
  }
  return tokens
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشرشده',
  OUT: 'ناموجود',
  ARCHIVED: 'آرشیو',
}

type ProductCandidate = {
  id: string
  name: string
  sku: string
  brand: string | null
  model: string | null
  salePrice: number
  discountPrice: number | null
  stock: number
  status: string
  shortDesc: string | null
  longDesc: string | null
  attributes: string
  category: { name: string }
}

/** Score = how many question tokens hit this product (name hits weigh more). */
function scoreProduct(p: ProductCandidate, tokens: string[]): number {
  const hay = {
    name: p.name.toLowerCase(),
    brand: (p.brand || '').toLowerCase(),
    model: (p.model || '').toLowerCase(),
    desc: `${p.shortDesc || ''} ${p.longDesc || ''}`.toLowerCase(),
  }
  let score = 0
  for (const t of tokens) {
    if (hay.name.includes(t)) score += 3
    if (hay.brand.includes(t)) score += 2
    if (hay.model.includes(t)) score += 2
    if (hay.desc.includes(t)) score += 1
  }
  return score
}

/** RAG retrieval: find products in the DB that match the user's question. */
async function retrieveProducts(message: string): Promise<ProductCandidate[]> {
  const tokens = extractSearchTokens(message)
  if (!tokens.length) return []

  const candidates = await db.product.findMany({
    where: {
      deletedAt: null,
      OR: tokens.flatMap((t) => [
        { name: { contains: t } },
        { brand: { contains: t } },
        { model: { contains: t } },
        { shortDesc: { contains: t } },
        { longDesc: { contains: t } },
      ]),
    },
    include: { category: { select: { name: true } } },
    take: 12,
  })

  return (candidates as unknown as ProductCandidate[])
    .map((p) => ({ p, s: scoreProduct(p, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.p.status === 'PUBLISHED' ? -1 : 1))
    .slice(0, 5)
    .map((x) => x.p)
}

function formatProduct(p: ProductCandidate, currencyLabel: string, fmt: (n: number) => string, index: number): string {
  const lines = [
    `${index}. ${p.name} | برند: ${p.brand || '—'} | دسته: ${p.category?.name || '—'} | کد: ${p.sku}`,
    `   قیمت: ${fmt(p.salePrice)} ${currencyLabel}` + (p.discountPrice ? ` (با تخفیف: ${fmt(p.discountPrice)} ${currencyLabel})` : '') +
      ` | موجودی انبار: ${fmt(p.stock)} عدد | وضعیت: ${STATUS_LABEL[p.status] || p.status}`,
  ]
  if (p.shortDesc) lines.push(`   توضیح کوتاه: ${p.shortDesc}`)
  if (p.longDesc) lines.push(`   توضیح کامل: ${p.longDesc.slice(0, 600)}`)
  try {
    const attrs = JSON.parse(p.attributes) as Array<{ key: string; value: string }>
    const pairs = attrs.filter((a) => a?.key && a?.value).map((a) => `${a.key}: ${a.value}`)
    if (pairs.length) lines.push(`   مشخصات: ${pairs.slice(0, 8).join('؛ ')}`)
  } catch { /* attributes is not valid JSON — skip */ }
  return lines.join('\n')
}

/** Persian assistant with live store context + RAG product lookup. Any panel user with report.view can chat. */
export async function POST(req: NextRequest) {
  const g = await guard('report.view')
  if ('resp' in g) return g.resp

  const body = await req.json().catch(() => ({}))
  const message = String(body.message || '').trim().slice(0, 4000)
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter((m: ChatMessage) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-10)
        .map((m: ChatMessage) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    : []

  if (!message) return NextResponse.json({ error: 'پیام خالی است' }, { status: 400 })

  // RAG step 1: retrieve products matching the question from the DB
  const matched = await retrieveProducts(message)

  // Build compact live context
  const canSeeSensitive = can(g.user.role, 'product.view') // all roles can; amounts need report.view which they already have
  const [productCount, lowStock, outStock, recentSales, topProducts, store] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.product.findMany({
      where: { deletedAt: null, stock: { lte: 3, gt: 0 } },
      select: { name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 5,
    }),
    db.product.findMany({
      where: { deletedAt: null, stock: { lte: 0 } },
      select: { name: true },
      take: 5,
    }),
    db.sale.findMany({
      orderBy: { soldAt: 'desc' },
      take: 8,
      include: { product: { select: { name: true } } },
    }),
    db.sale.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    }),
    db.setting.findUnique({ where: { id: 'main' } }),
  ])

  const topNames = await Promise.all(
    topProducts.map(async (t) => {
      const p = await db.product.findUnique({ where: { id: t.productId }, select: { name: true } })
      return p ? `${p.name} (${t._count.productId} فروش)` : ''
    }),
  )

  const fmt = (n: number) => n.toLocaleString('fa-IR')
  const currencyLabel = store?.currency === 'RIAL' ? 'ریال' : 'تومان'

  // RAG step 2: inject the retrieved products (full real data) into the context
  const productsBlock = matched.length
    ? [
        `محصولات مرتبط با سوال کاربر (${matched.length} مورد — این داده‌ها واقعی و قابل استناد هستند):`,
        ...matched.map((p, i) => formatProduct(p, currencyLabel, fmt, i + 1)),
      ].join('\n')
    : 'هیچ محصولی در دیتابیس با سوال کاربر مطابقت نداشت.'

  const context = [
    `نام فروشگاه: ${store?.storeName || 'فروشگاه موبایل'}`,
    `واحد پول: ${currencyLabel}`,
    `تعداد محصولات فعال: ${fmt(productCount)}`,
    lowStock.length ? `موجودی کم (۳ یا کمتر):\n${lowStock.map((p) => `- ${p.name}: ${fmt(p.stock)} عدد`).join('\n')}` : 'موجودی کم: ندارد',
    outStock.length ? `ناموجود:\n${outStock.map((p) => `- ${p.name}`).join('\n')}` : 'ناموجود: ندارد',
    topNames.filter(Boolean).length ? `پرفروش‌ترین‌ها:\n${topNames.filter(Boolean).map((s) => `- ${s}`).join('\n')}` : '',
    canSeeSensitive && recentSales.length
      ? `آخرین فروش‌ها:\n${recentSales
          .map((s) => `- ${s.product.name} × ${fmt(s.qty)} — ${fmt(s.unitPrice * s.qty)} ${currencyLabel} — ${s.soldAt.toLocaleDateString('fa-IR')}`)
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const system = [
    'تو دستیار هوشمند پنل مدیریت یک فروشگاه موبایل ایرانی هستی.',
    'همیشه فارسی روان و دوستانه پاسخ بده و اعداد را با ارقام فارسی بنویس.',
    'اگر کاربر دربارهٔ محصولی پرسید، از بخش «محصولات مرتبط» استفاده کن و جواب را دقیقاً بر اساس داده‌های واقعی همان محصول بده: نام، برند، قیمت، موجودی، مشخصات و توضیحات را از همان‌جا نقل کن و توضیح محصول را برایش معرفی کن.',
    'اگر بخش «محصولات مرتبط» می‌گوید هیچ محصولی مطابقت نداشت، صادقانه بگو چنین محصولی در فروشگاه پیدا نکردی؛ هرگز نام، قیمت، موجودی یا توضیح محصولی را از خودت نساز.',
    'داده‌های زنده فروشگاه در پیام سیستم آمده؛ فقط بر اساس آن‌ها درباره موجودی، فروش و محصولات حرف بزن.',
    'اگر چیزی در داده‌ها نیست، صادقانه بگو اطلاعاتی نداری و پیشنهاد بده کاربر از بخش‌های پنل استفاده کند.',
    'پاسخ‌ها کوتاه و کاربردی باشند (حداکثر چند جمله یا فهرست کوتاه).',
    'درباره موضوعات غیر از فروشگاه، مختصر و مفید کمک کن و وارد بحث‌های سیاسی و حساس نشو.',
    'به کاربر یادآوری کن قیمت‌ها را از بخش قیمت‌گذاری پنل بررسی کند اگر پرسید قیمت محصولی را که در داده‌ها نیست.',
    '',
    '— محصولات مرتبط با این سوال (RAG از دیتابیس) —',
    productsBlock,
    '',
    '— داده‌های زنده فروشگاه —',
    context,
  ].join('\n')

  try {
    const text = await generateAiText(message, {
      system,
      history: history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }) as GeminiTurn),
      maxTokens: 800,
    })
    return NextResponse.json({ reply: text, sources: matched.map((p) => p.name) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'پاسخ هوش مصنوعی ناموفق بود' },
      { status: 400 },
    )
  }
}
