import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

// همان الگوریتم هش src/lib/auth.ts — scrypt با salt تصادفی
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// دقیقاً همان کاربران تعریف seed — فقط ساخت کاربر، بدون پاک کردن هیچ چیز دیگر
const users = [
  { username: 'taha', name: 'طاها', role: 'SUPER_ADMIN', password: 'taha2212' },
  { username: 'sara', name: 'سارا رضایی', role: 'STAFF', password: 'sara1234' },
  { username: 'ali', name: 'علی محمدی', role: 'VIEWER', password: 'ali1234' },
]

for (const u of users) {
  await db.user.upsert({
    where: { username: u.username },
    update: { passwordHash: hashPassword(u.password), role: u.role, name: u.name, active: true },
    create: { username: u.username, name: u.name, role: u.role, passwordHash: hashPassword(u.password) },
  })
  console.log(`✅ ${u.username} (${u.role})`)
}

console.log('تعداد کاربران:', await db.user.count())

const s = await db.setting.findUnique({ where: { id: 'main' }, select: { storeName: true, aiProvider: true, geminiKey: true } })
console.log('تنظیمات فروشگاه:', s ? `storeName=${s.storeName} | aiProvider=${s.aiProvider} | geminiKey=${s.geminiKey ? 'ذخیره ✓' : 'خالی!'}` : '❌ رکورد setting هم پاک شده')

await db.$disconnect()
