import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const db = new PrismaClient()
const data = JSON.parse(readFileSync('data/products-export.json', 'utf8'))

// ---------- دسته‌ها از خود بکاپ ----------
const slugMap = { 'گلس': 'gles', 'گوشی': 'phone', 'لنز دوربین': 'camera-lens', 'اداپتور': 'adapter' }
const catIdByName = new Map()
let order = 1
for (const name of [...new Set(data.products.map((p) => p.category).filter(Boolean))]) {
  const existing = await db.category.findFirst({ where: { name } })
  if (existing) { catIdByName.set(name, existing.id); continue }
  const c = await db.category.create({
    data: { name, slug: slugMap[name] || `cat-${order}-${name.replace(/\s+/g, '-')}`, order: order++ },
  })
  catIdByName.set(name, c.id)
  console.log(`📁 دسته ساخته شد: ${name}`)
}

// ---------- محصولات ----------
let created = 0, skipped = 0
for (const p of data.products) {
  const exists = await db.product.findUnique({ where: { sku: p.sku } })
  if (exists) { skipped++; continue }
  await db.product.create({
    data: {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: catIdByName.get(p.category) || [...catIdByName.values()][0],
      brand: p.brand,
      model: p.model,
      salePrice: p.salePrice,
      discountPrice: p.discountPrice,
      costPrice: p.costPrice,
      stock: p.stock,
      status: p.status,
      attributes: JSON.stringify(p.attributes || []),
      images: JSON.stringify(p.images || []),
      shortDesc: p.shortDesc,
      longDesc: p.longDesc,
      metaTitle: p.metaTitle,
      metaDesc: p.metaDesc,
    },
  })
  created++
}

console.log(`✅ ${created} محصول بازیابی شد | ردشده (تکراری): ${skipped}`)
console.log('نهایی — محصولات:', await db.product.count(), '| دسته‌ها:', await db.category.count())
await db.$disconnect()
