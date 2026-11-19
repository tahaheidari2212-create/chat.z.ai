'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

export type ChatMsg = { role: 'user' | 'assistant'; content: string }

export const CHAT_WELCOME: ChatMsg = {
  role: 'assistant',
  content:
    'سلام! من دستیار هوشمند فروشگاه هستم و به داده‌های زنده پنل (موجودی، فروش‌ها و محصولات) متصل‌ام.\nهر سوالی درباره فروشگاه داری بپرس.',
}

export const CHAT_SUGGESTIONS = [
  'موجودی کدام محصولات کم است؟',
  'پرفروش‌ترین محصولات کدامند؟',
  'آخرین فروش‌ها را بگو',
]

/** Shared state/logic for the AI assistant chat (settings panel + floating widget). */
export function useAiChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([CHAT_WELCOME])
  const [sending, setSending] = useState(false)
  const msgsRef = useRef<ChatMsg[]>(msgs)
  const sendingRef = useRef(false)

  useEffect(() => { msgsRef.current = msgs }, [msgs])

  const send = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setMsgs((m) => [...m, { role: 'user', content: message }])
    try {
      const res = await api<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          history: msgsRef.current.filter((m) => m !== CHAT_WELCOME).slice(-10),
        }),
      })
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: err instanceof Error ? `⚠️ ${err.message}` : '⚠️ پاسخی دریافت نشد',
        },
      ])
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [])

  const reset = useCallback(() => setMsgs([CHAT_WELCOME]), [])

  return { msgs, sending, send, reset }
}
