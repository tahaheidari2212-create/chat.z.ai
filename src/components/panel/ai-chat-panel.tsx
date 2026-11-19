'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, RotateCcw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAiChat, CHAT_SUGGESTIONS } from '@/hooks/use-ai-chat'

type Props = { geminiConfigured: boolean }

/** Full-size chat panel embedded in the Settings page. */
export function AiChatPanel({ geminiConfigured }: Props) {
  const { msgs, sending, send, reset } = useAiChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs, sending])

  function submit() {
    const text = input
    if (!text.trim() || sending) return
    setInput('')
    void send(text)
  }

  return (
    <div
      className="flex flex-col h-[480px] rounded-xl border border-blue-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950"
      dir="rtl"
    >
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-l from-blue-600 to-blue-500 text-white shrink-0">
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
          <Bot className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">دستیار هوشمند فروشگاه</p>
          <p className="text-[11px] text-blue-100">
            {geminiConfigured ? 'متصل به داده‌های زنده پنل' : 'غیرفعال — کلید هوش مصنوعی ثبت نشده'}
          </p>
        </div>
        <button
          onClick={reset}
          disabled={sending}
          className="p-2 rounded-lg hover:bg-white/15 transition-colors disabled:opacity-50"
          title="شروع گفت‌وگوی جدید"
          aria-label="شروع گفت‌وگوی جدید"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* not-configured warning */}
      {!geminiConfigured && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs shrink-0">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            برای فعال‌سازی چت، کلید Gemini را در کارت «هوش مصنوعی Gemini» بالای همین صفحه وارد و تنظیمات را ذخیره کنید.
          </span>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-blue-50/40 dark:bg-slate-900/40">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-6 whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-blue-100 dark:border-slate-700 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-end">
            <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          </div>
        )}
        {msgs.length <= 1 && !sending && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-slate-400">پیشنهاد شروع گفت‌وگو:</p>
            {CHAT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                disabled={sending}
                className="block w-full text-right text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-60"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 p-3 border-t border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="سؤالت را بنویس… (مثلاً: موجودی آیفون ۱۵ چنده؟)"
          disabled={sending}
          className="h-10"
        />
        <Button
          className="h-10 px-4 shrink-0 bg-blue-600 hover:bg-blue-700"
          onClick={submit}
          disabled={sending || !input.trim()}
          aria-label="ارسال پیام"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          ارسال
        </Button>
      </div>
    </div>
  )
}
