import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { username: true, name: true, role: true } })
console.log(JSON.stringify(users, null, 1))
const s = await db.setting.findUnique({ where: { id: 'main' } })
console.log('geminiKey set:', Boolean(s?.geminiKey), s?.geminiKey ? `masked=${s.geminiKey.slice(0,6)}...` : '')
await db.$disconnect()
