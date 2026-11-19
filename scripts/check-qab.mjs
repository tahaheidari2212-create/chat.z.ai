import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const qab = await db.category.findMany({ where: { name: { contains: 'قاب' } } })
for (const c of qab) {
  const prods = await db.product.findMany({ where: { categoryId: c.id }, select: { name: true, status: true, deletedAt: true, stock: true } })
  console.log(`CATEGORY ${c.name} (${c.id}):`)
  for (const p of prods) console.log(`  - ${p.name} | status=${p.status} | stock=${p.stock} | deleted=${!!p.deletedAt}`)
}
const all = await db.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: { where: { deletedAt: null } } } } } })
console.log('\nALL CATS:', all.length)
for (const c of all) console.log(`- ${c.name} order=${c.order} live=${c._count.products}`)
await db.$disconnect()
