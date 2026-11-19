import { readFileSync, existsSync } from 'fs'

const BASE = 'https://foroshgan-mobile.vercel.app'

// ۲۲ دسته‌بندی واقعی — استخراج‌شده از اسنپ‌شات دیتابیس قدیمی
const CATEGORIES = [
  { name: 'گوشی', slug: 'گوشی', icon: 'Smartphone', order: 0 },
  { name: 'مونو پاد', slug: 'مونو-پاد', icon: 'Smartphone', order: 0 },
  { name: 'لنز دوربین', slug: 'لنز-دوربین', icon: 'Smartphone', order: 0 },
  { name: 'گلس', slug: 'glass', icon: 'Shield', order: 1 },
  { name: 'قاب', slug: 'case', icon: 'Smartphone', order: 2 },
  { name: 'اداپتور', slug: 'adapter', icon: 'Plug', order: 3 },
  { name: 'محافظ شارژ و ایرپاد', slug: 'charger-airpods-protector', icon: 'Shield', order: 4 },
  { name: 'او تی جی', slug: 'otg', icon: 'Usb', order: 5 },
  { name: 'دانگل', slug: 'dongle', icon: 'Plug', order: 6 },
  { name: 'بند اپل واچ', slug: 'apple-watch-band', icon: 'Watch', order: 7 },
  { name: 'کابل شارژ', slug: 'charging-cable', icon: 'Cable', order: 8 },
  { name: 'فندکی', slug: 'lighter', icon: 'Flame', order: 9 },
  { name: 'هندزفری', slug: 'handsfree', icon: 'Headphones', order: 10 },
  { name: 'aox', slug: 'aox', icon: 'AudioLines', order: 11 },
  { name: 'هولدر', slug: 'holder', icon: 'Smartphone', order: 12 },
  { name: 'اسپیکر', slug: 'speaker', icon: 'Speaker', order: 13 },
  { name: 'گیمینگ', slug: 'gaming', icon: 'Gamepad2', order: 14 },
  { name: 'ایرپاد', slug: 'airpods', icon: 'Headphones', order: 15 },
  { name: 'پاور بانک', slug: 'power-bank', icon: 'BatteryCharging', order: 16 },
  { name: 'گوگولی جات', slug: 'googoly', icon: 'ToyBrick', order: 17 },
  { name: 'تبدیل 3.2', slug: 'converter-3-2', icon: 'Plug', order: 18 },
  { name: 'لوازم جانبی', slug: 'accessories', icon: 'Package', order: 19 },
]

async function main() {
  // ---------- login ----------
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'taha', password: 'taha2212' }),
  })
  if (!loginRes.ok) throw new Error('login failed: ' + loginRes.status)
  const cookie = (loginRes.headers.getSetCookie().find((c) => c.startsWith('shop_session=')) || '').split(';')[0]
  const H = { Cookie: cookie }
  console.log('login ✓')

  const j = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...H, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  }

  // ---------- categories ----------
  const cats = (await j('GET', '/api/categories')).data.categories || []
  const byName = new Map(cats.map((c) => [c.name, c.id]))
  let catCreated = 0
  for (const c of CATEGORIES) {
    if (byName.has(c.name)) continue
    const r = await j('POST', '/api/categories', c)
    if (r.status === 201) { byName.set(c.name, r.data.category.id); catCreated++ }
    else console.log('  cat err:', c.name, r.status, JSON.stringify(r.data).slice(0, 120))
  }
  console.log(`دسته‌ها: استفاده‌مجدد ${CATEGORIES.length - catCreated} | ساخته ${catCreated} | کل نقشه ${byName.size}`)

  // ---------- existing SKUs ----------
  const existing = new Set()
  {
    const r = await j('GET', '/api/products?page=1&per=500')
    const list = r.data.products || []
    list.forEach((p) => existing.add(p.sku))
    console.log('محصولات موجود روی سایت:', existing.size)
  }

  // ---------- image uploader (cached) ----------
  const imgCache = new Map()
  async function uploadImage(fname, mime) {
    if (imgCache.has(fname)) return imgCache.get(fname)
    const local = `/home/z/my-project/public/uploads/${fname}`
    if (!existsSync(local)) { console.log('  فایل لوکال نیست:', fname); return null }
    const buf = readFileSync(local)
    const fd = new FormData()
    fd.append('file', new Blob([buf], { type: mime }), fname)
    const res = await fetch(`${BASE}/api/uploads`, { method: 'POST', headers: { ...H }, body: fd })
    const data = await res.json().catch(() => ({}))
    if (res.status !== 201) { console.log('  خطای آپلود:', fname, res.status, JSON.stringify(data).slice(0, 120)); return null }
    imgCache.set(fname, data.url)
    return data.url
  }

  // ---------- products ----------
  const exp = JSON.parse(readFileSync('/home/z/my-project/data/products-export.json', 'utf8'))
  let created = 0, skipped = 0, errs = 0, noCat = 0
  for (const p of exp.products) {
    try {
      if (existing.has(p.sku)) { skipped++; continue }
      const cid = byName.get(p.category)
      if (!cid) { console.log('  دسته نیست:', p.category, p.sku); noCat++; continue }

      let urls = []
      try { urls = JSON.parse(p.images || '[]') } catch { urls = [] }
      // فایل‌های public/uploads در گیت هستند و با دیپلوی جدید سرو می‌شوند — URL اصلی حفظ می‌شود
      void uploadImage

      const body = {
        name: p.name, slug: p.slug, sku: p.sku, categoryId: cid,
        brand: p.brand || null, model: p.model || null,
        salePrice: p.salePrice || 0, discountPrice: p.discountPrice ?? null, costPrice: p.costPrice ?? null,
        stock: p.stock || 0, status: p.status || 'PUBLISHED',
        attributes: p.attributes || '[]',
        images: urls,
        shortDesc: p.shortDesc ?? null, longDesc: p.longDesc ?? null,
        metaTitle: p.metaTitle ?? null, metaDesc: p.metaDesc ?? null,
      }
      const r = await j('POST', '/api/products', body)
      if (r.status === 201) { created++; existing.add(p.sku); process.stdout.write(`✓${p.sku} `) }
      else { errs++; console.log('\n  prod err:', p.sku, r.status, JSON.stringify(r.data).slice(0, 150)) }
      await new Promise((s) => setTimeout(s, 120))
    } catch (e) { errs++; console.log('\n  exc:', p.sku, e.message) }
  }
  console.log(`\nنتیجه: ساخته ${created} | ازقبل ${skipped} | خطا ${errs} | بی‌دسته ${noCat} | عکس‌های آپلودی ${imgCache.size}`)
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })
