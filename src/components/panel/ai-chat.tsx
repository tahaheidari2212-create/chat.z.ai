'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, MessageCircle, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAiChat, CHAT_SUGGESTIONS } from '@/hooks/use-ai-chat'

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const { msgs, sending, send, reset } = useAiChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs, open, sending])

  function submit() {
    const text = input
    if (!text.trim() || sending) return
    setInput('')
    void send(text)
  }

  return (
    <>
      {/* floating button */}
      <Button
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 left-5 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
        title="دستیار هوشمند"
        aria-label="دستیار هوشمند"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>

      {/* chat panel */}
      {open && (
        <div
          className="fixed z-50 bottom-20 left-3 right-3 sm:right-auto sm:w-96 h-[28rem] sm:h-[30rem] flex flex-col rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
          dir="rtl"
        >
          {/* header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-l from-blue-600 to-blue-500 text-white shrink-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
              <Bot className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">دستیار هوشمند فروشگاه</p>
              <p className="text-[11px] text-blue-100">متصل به داده‌های زنده پنل</p>
            </div>
            <button
              onClick={reset}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              title="گفت‌وگوی جدید"
              aria-label="گفت‌وگوی جدید"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors sm:hidden"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-blue-50/40 dark:bg-slate-900/40">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-6 whitespace-pre-wrap break-words ${
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
                <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            {msgs.length <= 1 && !sending && (
              <div className="space-y-1.5 pt-1">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="block w-full text-right text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* input */}
          <div className="flex items-center gap-2 p-2.5 border-t border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="سؤال بپرسید…"
              disabled={sending}
              className="h-9"
            />
            <Button
              size="icon" className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700"
              onClick={submit} disabled={sending || !input.trim()}
              aria-label="ارسال"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
