import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
for (const m of ['product', 'category', 'user', 'sale', 'setting']) {
  try { console.log(m + ':', await db[m].count()) } catch (e) { console.log(m + ': ERR') }
}
await db.$disconnect()
