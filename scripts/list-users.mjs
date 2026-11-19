import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { username: true, role: true, passwordHash: true, createdAt: true } })
for (const u of users) console.log(`- user="${u.username}" role=${u.role} hash=${u.passwordHash.slice(0,10)}... (${u.password.length} chars)`)
await db.$disconnect()
