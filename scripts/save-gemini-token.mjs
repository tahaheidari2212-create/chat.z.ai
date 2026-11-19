import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const token = process.argv[2] || ''
if (!token) { console.error('Usage: node scripts/save-gemini-token.mjs <TOKEN>'); process.exit(1) }
const s = await db.setting.upsert({
  where: { id: 'main' },
  update: { geminiKey: token, aiProvider: 'zai' },
  create: { id: 'main', apiKey: crypto.randomUUID().replace(/-/g, ''), geminiKey: token, aiProvider: 'zai' },
})
console.log('saved: geminiKey =', s.geminiKey.slice(0, 8) + '...', '| aiProvider =', s.aiProvider)
await db.$disconnect()
