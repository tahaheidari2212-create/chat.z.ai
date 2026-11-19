import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const prods = await db.product.findMany({ select: { name: true, sku: true, categoryId: true, category: { select: { name: true } }, deletedAt: true } })
console.log('PRODUCT COUNT:', prods.length)
for (const p of prods) console.log(`- ${p.name} | sku=${p.sku} | cat=${p.category.name}${p.deletedAt ? ' | DELETED' : ''}`)
await db.$disconnect()
