import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const ps = await db.product.findMany({
  where: { deletedAt: null },
  select: { name: true, brand: true, salePrice: true, stock: true, status: true },
  take: 12,
})
for (const p of ps) console.log(`- ${p.name} | ${p.brand || '—'} | ${p.salePrice} | stock=${p.stock} | ${p.status}`)
await db.$disconnect()
