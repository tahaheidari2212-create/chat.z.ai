import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

// دقیقاً مثل seed.ts — فقط رکورد تنظیمات، بدون دست زدن به محصولات و دسته‌ها
await db.setting.upsert({
  where: { id: 'main' },
  update: {},
  create: {
    id: 'main',
    storeName: 'فروشگاه موبایل',
    aiProvider: 'zai',
    reminderEnabled: true,
    reminderHour: 10,
    reminderMinute: 0,
    apiKey: crypto.randomUUID().replace(/-/g, ''),
  },
})

const s = await db.setting.findUnique({ where: { id: 'main' }, select: { storeName: true, aiProvider: true, apiKey: true } })
console.log('✅ تنظیمات:', `storeName=${s?.storeName} | aiProvider=${s?.aiProvider} | apiKey=${s?.apiKey ? 'ساخته شد ✓' : 'خالی!'}`)
await db.$disconnect()
