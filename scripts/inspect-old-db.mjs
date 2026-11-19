import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const counts = {}
for (const m of ['category', 'product', 'sale', 'user', 'note', 'setting']) {
  counts[m] = await db[m].count()
}
console.log('COUNTS:', JSON.stringify(counts))

const cats = await db.category.findMany({
  orderBy: { order: 'asc' },
  select: { name: true, slug: true, icon: true, parentId: true, order: true },
})
console.log('CATEGORIES (' + cats.length + '):')
for (const c of cats) console.log(`- ${c.name} | slug=${c.slug} | icon=${c.icon || '—'} | parent=${c.parentId ? 'yes' : '—'} | order=${c.order}`)

const s = await db.setting.findUnique({ where: { id: 'main' }, select: { storeName: true, aiProvider: true } })
console.log('SETTING:', JSON.stringify(s))

await db.$disconnect()
