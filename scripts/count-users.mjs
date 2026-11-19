import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const n = await db.user.count()
console.log('تعداد کاربران:', n)
const sample = await db.user.findMany({ take: 5, select: { username: true, role: true, active: true } })
console.log(JSON.stringify(sample))
await db.$disconnect()
