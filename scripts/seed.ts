// Seed script — run with: bun scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes, randomUUID } from 'crypto'
import { existsSync } from 'fs'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// deterministic PRNG so the demo data is stable
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const img = (name: string) => (existsSync(`public/products/${name}`) ? [`/products/${name}`] : [])

async function main() {
  console.log('Seeding...')

  await db.priceCheck.deleteMany()
  await db.priceHistory.deleteMany()
  await db.stockLog.deleteMany()
  await db.sale.deleteMany()
  // SAFETY: این اسکریپت همهٔ داده‌های واقعی را پاک می‌کند — فقط با پرچم صریح اجرا شود
  if (!process.argv.includes('--hard-reset')) {
    console.error('⛔ خطر: این اسکریپت محصولات/دسته‌ها/کاربران/تنظیمات را پاک می‌کند.')
    console.error('برای اجرای عمدی: npx tsx scripts/seed.ts --hard-reset')
    process.exit(1)
  }
  await db.note.deleteMany()
  await db.auditLog.deleteMany()
  await db.loginLog.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.user.deleteMany()
  await db.setting.deleteMany()

  // ---------- users ----------
  const taha = await db.user.create({
    data: {
      username: 'taha',
      name: 'طاها',
      role: 'SUPER_ADMIN',
      passwordHash: hashPassword('taha2212'),
    },
  })
  await db.user.create({
    data: { username: 'sara', name: 'سارا رضایی', role: 'STAFF', passwordHash: hashPassword('sara1234') },
  })
  await db.user.create({
    data: { username: 'ali', name: 'علی محمدی', role: 'VIEWER', passwordHash: hashPassword('ali1234') },
  })
  console.log('Users: taha / sara / ali')

  // ---------- settings ----------
  await db.setting.create({
    data: {
      id: 'main',
      storeName: 'فروشگاه موبایل',
      reminderEnabled: true,
      reminderHour: 10,
      reminderMinute: 0,
      apiKey: randomUUID().replace(/-/g, ''),
    },
  })

  // ---------- categories ----------
  const phone = await db.category.create({ data: { name: 'گوشی', slug: 'phone', icon: 'Smartphone', order: 1 } })
  const cApple = await db.category.create({ data: { name: 'اپل', slug: 'phone-apple', icon: 'Smartphone', parentId: phone.id, order: 1 } })
  const cSamsung = await db.category.create({ data: { name: 'سامسونگ', slug: 'phone-samsung', parentId: phone.id, order: 2 } })
  const cXiaomi = await db.category.create({ data: { name: 'شیائومی', slug: 'phone-xiaomi', parentId: phone.id, order: 3 } })
  const cCase = await db.category.create({ data: { name: 'قاب و گلس', slug: 'case', icon: 'Shield', order: 2 } })
  const cEarbud = await db.category.create({ data: { name: 'ایرپاد و هندزفری', slug: 'earbuds', icon: 'Headphones', order: 3 } })
  const cCharger = await db.category.create({ data: { name: 'شارژر و کابل', slug: 'charger', icon: 'BatteryCharging', order: 4 } })

  // ---------- products ----------
  const products = await Promise.all([
    db.product.create({
      data: {
        name: 'گوشی iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max', sku: 'PH-15001', categoryId: cApple.id,
        brand: 'Apple', model: 'iPhone 15 Pro Max',
        salePrice: 89500000, costPrice: 86000000, stock: 4, lowStockThreshold: 3,
        images: JSON.stringify(img('phone-titanium.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'تیتانیوم طبیعی' }, { key: 'حافظه', value: '۲۵۶ گیگابایت' },
          { key: 'گارانتی', value: '۱۸ ماه' }, { key: 'وضعیت', value: 'آکبند' }, { key: 'IMEI', value: '35*' },
        ]),
        shortDesc: 'پرچمدار اپل با تراشه A17 Pro و بدنه تیتانیوم',
        longDesc: 'iPhone 15 Pro Max با بدنه تیتانیوم سبک، تراشه A17 Pro و دوربین ۴۸ مگاپیکسلی، قدرتمندترین گوشی اپل است. پورت USB-C، دکمه Action و عملکرد فوق‌العاده در بازی و عکاسی حرفه‌ای.',
      },
    }),
    db.product.create({
      data: {
        name: 'گوشی Samsung Galaxy S24 Ultra',
        slug: 'galaxy-s24-ultra', sku: 'PH-24002', categoryId: cSamsung.id,
        brand: 'Samsung', model: 'Galaxy S24 Ultra',
        salePrice: 72800000, discountPrice: 69900000, costPrice: 68000000, stock: 5, lowStockThreshold: 3,
        images: JSON.stringify(img('phone-violet.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'بنفش کهکشانی' }, { key: 'حافظه', value: '۵۱۲ گیگابایت' },
          { key: 'گارانتی', value: '۱۸ ماه' }, { key: 'وضعیت', value: 'آکبند' },
        ]),
        shortDesc: 'قلم S Pen، دوربین ۲۰۰ مگاپیکسل و هوش مصنوعی گلکسی',
      },
    }),
    db.product.create({
      data: {
        name: 'گوشی Xiaomi 14',
        slug: 'xiaomi-14', sku: 'PH-14003', categoryId: cXiaomi.id,
        brand: 'Xiaomi', model: 'Xiaomi 14',
        salePrice: 41200000, costPrice: 39000000, stock: 6, lowStockThreshold: 3,
        images: JSON.stringify(img('phone-green.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'سبز جنگلی' }, { key: 'حافظه', value: '۲۵۶ گیگابایت' },
          { key: 'گارانتی', value: '۱۲ ماه' }, { key: 'وضعیت', value: 'آکبند' },
        ]),
        shortDesc: 'دوربین Leica و پردازنده Snapdragon 8 Gen 3',
      },
    }),
    db.product.create({
      data: {
        name: 'گوشی iPhone 13',
        slug: 'iphone-13', sku: 'PH-13004', categoryId: cApple.id,
        brand: 'Apple', model: 'iPhone 13',
        salePrice: 38900000, stock: 2, lowStockThreshold: 3,
        images: JSON.stringify(img('phone-black.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'مشکی' }, { key: 'حافظه', value: '۱۲۸ گیگابایت' },
          { key: 'وضعیت', value: 'آکبند' },
        ]),
        shortDesc: 'انتخاب اقتصادی اپل با باتری قوی',
      },
    }),
    db.product.create({
      data: {
        name: 'گوشی Samsung Galaxy A55',
        slug: 'galaxy-a55', sku: 'PH-55005', categoryId: cSamsung.id,
        brand: 'Samsung', model: 'Galaxy A55',
        salePrice: 24500000, stock: 8, lowStockThreshold: 3,
        images: JSON.stringify(img('phone-blue.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'آبی یخی' }, { key: 'حافظه', value: '۱۲۸ گیگابایت' },
          { key: 'گارانتی', value: '۱۸ ماه' },
        ]),
        shortDesc: 'میان‌رده محبوب سامسونگ با نمایشگر ۱۲۰ هرتز',
      },
    }),
    db.product.create({
      data: {
        name: 'گوشی Redmi Note 13 Pro',
        slug: 'redmi-note-13-pro', sku: 'PH-13006', categoryId: cXiaomi.id,
        brand: 'Xiaomi', model: 'Redmi Note 13 Pro',
        salePrice: 14800000, stock: 10, lowStockThreshold: 4,
        images: JSON.stringify(img('phone-silver.png')),
        attributes: JSON.stringify([
          { key: 'رنگ', value: 'نقره‌ای' }, { key: 'حافظه', value: '۲۵۶ گیگابایت' },
          { key: 'گارانتی', value: '۱۲ ماه' },
        ]),
        shortDesc: 'دوربین ۲۰۰ مگاپیکسل با قیمت اقتصادی',
      },
    }),
    db.product.create({
      data: {
        name: 'قاب شفاف سیلیکونی iPhone 15',
        slug: 'clear-silicone-case-iphone-15', sku: 'CS-15007', categoryId: cCase.id,
        brand: 'Generic', salePrice: 89000, costPrice: 45000, stock: 25, lowStockThreshold: 5,
        images: JSON.stringify(img('case-clear.png')),
        attributes: JSON.stringify([{ key: 'جنس', value: 'سیلیکون شفاف' }, { key: 'سازگار با', value: 'iPhone 15' }]),
        shortDesc: 'قاب نازک و ضدزرد‌شدگی',
      },
    }),
    db.product.create({
      data: {
        name: 'قاب چرمی Galaxy S24 Ultra',
        slug: 'leather-case-galaxy-s24', sku: 'CS-24008', categoryId: cCase.id,
        brand: 'Generic', salePrice: 245000, stock: 12, lowStockThreshold: 5,
        images: JSON.stringify(img('case-leather.png')),
        attributes: JSON.stringify([{ key: 'جنس', value: 'چرم طبیعی' }, { key: 'ویژگی', value: 'جای کارت' }]),
        shortDesc: 'قاب چرمی با جای کارت و دوخت دستی',
      },
    }),
    db.product.create({
      data: {
        name: 'قاب محافظ ضدضربه رزماری',
        slug: 'rugged-armor-case', sku: 'CS-99009', categoryId: cCase.id,
        brand: 'Generic', salePrice: 189000, stock: 2, lowStockThreshold: 4,
        images: JSON.stringify(img('case-rugged.png')),
        attributes: JSON.stringify([{ key: 'استاندارد', value: 'MIL-STD 810G' }]),
        shortDesc: 'گوشه‌های تقویت‌شده و مقاوم در برابر سقوط',
      },
    }),
    db.product.create({
      data: {
        name: 'قاب طرح موج آبی',
        slug: 'blue-wave-pattern-case', sku: 'CS-77010', categoryId: cCase.id,
        brand: 'Generic', salePrice: 129000, stock: 0, lowStockThreshold: 3,
        status: 'OUT',
        images: JSON.stringify(img('case-bluepattern.png')),
        attributes: JSON.stringify([{ key: 'طرح', value: 'موج آبی' }]),
        shortDesc: 'طرح اختصاصی موج آبی برای مدل‌های پرچمدار',
      },
    }),
    db.product.create({
      data: {
        name: 'ایرپاد بی‌سیم Pro',
        slug: 'wireless-earbuds-pro', sku: 'EB-30011', categoryId: cEarbud.id,
        brand: 'Generic', salePrice: 1450000, costPrice: 1100000, stock: 7, lowStockThreshold: 3,
        images: JSON.stringify(img('earbuds.png')),
        attributes: JSON.stringify([{ key: 'نحز نویز', value: 'ANC فعال' }, { key: 'باتری', value: '۳۰ ساعت با کیس' }]),
        shortDesc: 'حذف نویز فعال و ۳۰ ساعت پخش موسیقی',
      },
    }),
    db.product.create({
      data: {
        name: 'شارژر سریع ۶۵ وات + کابل USB-C',
        slug: 'fast-charger-65w', sku: 'CH-65012', categoryId: cCharger.id,
        brand: 'Generic', salePrice: 690000, stock: 15, lowStockThreshold: 5,
        images: JSON.stringify(img('charger.png')),
        attributes: JSON.stringify([{ key: 'توان', value: '۶۵ وات' }, { key: 'پورت', value: 'USB-C + USB-A' }]),
        shortDesc: 'شارژ هم‌زمان گوشی و لپ‌تاپ با گارانتی تعویض',
      },
    }),
  ])
  console.log(`Products: ${products.length}`)

  for (const p of products) {
    await db.stockLog.create({
      data: { productId: p.id, change: p.stock, reason: 'MANUAL', userId: taha.id },
    })
  }

  // ---------- sales history (35 days, deterministic) ----------
  const rand = mulberry32(20261112)
  const sellable = products.filter((p) => p.stock > 0 || true)
  let saleCount = 0
  for (let day = 35; day >= 0; day--) {
    const n = Math.floor(rand() * 4) + (day < 10 ? 2 : 1) // more sales recently
    for (let s = 0; s < n; s++) {
      const weighted = [0, 0, 1, 1, 2, 4, 5, 6, 7, 8, 10, 11, 11, 9]
      const p = sellable[weighted[Math.floor(rand() * weighted.length)]]
      const qty = rand() > 0.75 ? 2 : 1
      const unitPrice = p.discountPrice && rand() > 0.5 ? p.discountPrice : p.salePrice
      const hour = 9 + Math.floor(rand() * 11)
      const soldAt = new Date(Date.now() - day * 864e5)
      soldAt.setHours(hour, Math.floor(rand() * 60), 0, 0)
      await db.sale.create({
        data: {
          productId: p.id, qty, unitPrice, total: unitPrice * qty,
          soldById: rand() > 0.5 ? taha.id : undefined,
          soldAt,
          customerName: rand() > 0.6 ? ['آقای کریمی', 'خانم احمدی', 'آقای مرادی', 'خانم حسینی'][Math.floor(rand() * 4)] : null,
        },
      })
      saleCount += 1
    }
  }
  console.log(`Sales: ${saleCount}`)

  // ---------- price history ----------
  await db.priceHistory.create({
    data: { productId: products[0].id, oldPrice: 85000000, newPrice: 89500000, userId: taha.id, createdAt: new Date(Date.now() - 9 * 864e5) },
  })
  await db.priceHistory.create({
    data: { productId: products[1].id, oldPrice: 74500000, newPrice: 72800000, userId: taha.id, createdAt: new Date(Date.now() - 5 * 864e5) },
  })
  await db.priceHistory.create({
    data: { productId: products[6].id, oldPrice: 79000, newPrice: 89000, userId: taha.id, createdAt: new Date(Date.now() - 2 * 864e5) },
  })

  // ---------- notes ----------
  await db.note.create({
    data: {
      title: 'تماس با تأمین‌کننده قاب',
      body: 'شماره تماس آقای رضایی: ۰۹۱۲***۴۵۶۷ — سفارش ۵۰ عدد قاب شفاف. یادآوری: بعد از ظهر امروز تماس بگیر.',
      color: 'amber', pinned: true, productId: products[6].id, userId: taha.id,
    },
  })
  await db.note.create({
    data: {
      title: 'تسویه حساب هفتگی',
      body: 'هر پنجشنبه تسویه با پیک‌ها و بررسی موجودی صندوق. مبلغ نقدی اول هفته باید به صندوق برگردد.',
      color: 'green', pinned: true, userId: taha.id,
    },
  })
  await db.note.create({
    data: {
      title: 'ایرپادها گارانتی تعویض دارند',
      body: 'مشتری‌هایی که تا ۳۰ روز مشکل فنی گزارش دهند، تعویض کامل — نه تعمیر.',
      color: 'blue', productId: products[10].id, userId: taha.id,
    },
  })

  console.log('Seed complete.')
  console.log('Login: taha / taha2212 (Super Admin), sara / sara1234 (Staff), ali / ali1234 (Viewer)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
