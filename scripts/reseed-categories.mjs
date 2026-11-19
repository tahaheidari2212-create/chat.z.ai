// جایگزینی کامل دسته‌بندی‌ها طبق لیست کاربر (۱۹ دسته)
// 1) ساخت دسته‌های جدید  2) انتقال محصولات به نزدیک‌ترین دستهٔ جدید  3) حذف دسته‌های قدیمی
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// [name, slug, icon, order] — دقیقاً به ترتیب لیست کاربر
const NEW_CATS = [
  ['گلس', 'glass', 'Shield', 1],
  ['قاب', 'case', 'Smartphone', 2],
  ['اداپتور', 'adapter', 'Plug', 3],
  ['محافظ شارژ و ایرپاد', 'charger-airpods-protector', 'Shield', 4],
  ['او تی جی', 'otg', 'Usb', 5],
  ['دانگل', 'dongle', 'Plug', 6],
  ['بند اپل واچ', 'apple-watch-band', 'Watch', 7],
  ['کابل شارژ', 'charging-cable', 'Cable', 8],
  ['فندکی', 'lighter', 'Flame', 9],
  ['هندزفری', 'handsfree', 'Headphones', 10],
  ['aox', 'aox', 'AudioLines', 11],
  ['هولدر', 'holder', 'Smartphone', 12],
  ['اسپیکر', 'speaker', 'Speaker', 13],
  ['گیمینگ', 'gaming', 'Gamepad2', 14],
  ['ایرپاد', 'airpods', 'Headphones', 15],
  ['پاور بانک', 'power-bank', 'BatteryCharging', 16],
  ['گوگولی جات', 'googoly', 'ToyBrick', 17],
  ['تبدیل 3.2', 'converter-3-2', 'Plug', 18],
  ['لوازم جانبی', 'accessories', 'Package', 19],
]

// نگاشت دستهٔ قدیمی → دستهٔ جدید (بر اساس slug قدیمی)
const OLD_TO_NEW = {
  'case': 'case',            // قاب و گلس → قاب
  'charger': 'adapter',      // شارژر و کابل → اداپتور
  'earbuds': 'airpods',      // ایرپاد و هندزفری → ایرپاد
  'phone': 'accessories',
  'phone-apple': 'accessories',
  'phone-samsung': 'accessories',
  'phone-xiaomi': 'accessories',
}
const FALLBACK_NEW = 'accessories' // گوشی‌ها (دسته‌ای برای گوشی در لیست جدید نیست)

try {
  const result = await db.$transaction(async (tx) => {
    const oldCats = await tx.category.findMany()
    console.log('دسته‌های قدیمی:', oldCats.map((c) => c.slug).join(', '))

    // 1) آزادسازی slug های قدیمی (تا تداخلی با جدیدها پیش نیاید)
    for (const c of oldCats) {
      await tx.category.update({ where: { id: c.id }, data: { slug: `old-${c.slug}-${c.id.slice(-4)}` } })
    }

    // 2) ساخت ۱۹ دستهٔ جدید
    const created = {}
    for (const [name, slug, icon, order] of NEW_CATS) {
      const cat = await tx.category.create({ data: { name, slug, icon, order, active: true } })
      created[slug] = cat.id
      console.log(`+ ساخته شد: ${name} (order=${order}, icon=${icon})`)
    }

    // 3) انتقال محصولات از دسته‌های قدیمی به جدید
    let moved = 0
    for (const oc of oldCats) {
      const newSlug = OLD_TO_NEW[oc.slug] || FALLBACK_NEW
      const res = await tx.product.updateMany({
        where: { categoryId: oc.id },
        data: { categoryId: created[newSlug] },
      })
      moved += res.count
      if (res.count) console.log(`→ ${res.count} محصول از «${oc.name}» به «${newSlug}» منتقل شد`)
    }

    // 4) حذف دسته‌های قدیمی (اول قطع رابطهٔ والد-فرزندی)
    await tx.category.updateMany({ where: { id: { in: oldCats.map((c) => c.id) } }, data: { parentId: null } })
    const del = await tx.category.deleteMany({ where: { id: { in: oldCats.map((c) => c.id) } } })
    console.log(`× ${del.count} دستهٔ قدیمی حذف شد | ${moved} محصول منتقل شد`)
    return { del: del.count, moved }
  })

  // 5) گزارش نهایی
  const final = await db.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  console.log(`\n=== وضعیت نهایی: ${result.del} حذف، ${result.moved} محصول منتقل، ${final.length} دستهٔ جدید ===`)
  for (const c of final) console.log(`${String(c.order).padStart(2)} | ${c.name} | ${c.slug} | icon=${c.icon} | محصولات=${c._count.products}`)
} catch (e) {
  console.error('خطا:', e)
  process.exit(1)
} finally {
  await db.$disconnect()
}
