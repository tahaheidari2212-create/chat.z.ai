import ZAI from 'z-ai-web-dev-sdk'
const zai = await ZAI.create()
const completion = await zai.chat.completions.create({
  messages: [
    { role: 'assistant', content: 'تو یک نویسندهٔ توضیحات محصول فارسی هستی.' },
    { role: 'user', content: 'یک جملهٔ کوتاه برای گلس آیفون ۱۵ بنویس.' },
  ],
  thinking: { type: 'disabled' },
})
console.log('REPLY:', completion.choices?.[0]?.message?.content?.slice(0, 200))
