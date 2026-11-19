import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const cats = await db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { order: 'asc' } })
console.log('COUNT:', cats.length)
for (const c of cats) console.log(`- ${c.name} | slug=${c.slug} | icon=${c.icon} | parentId=${c.parentId ? 'yes' : 'no'} | products=${c._count.products}`)
await db.$disconnect()
