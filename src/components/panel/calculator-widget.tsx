'use client'

import { useEffect, useRef, useState } from 'react'
import { Calculator, X, Divide, Minus, Plus, Equal, Percent, Trash2, History, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePanel } from '@/store/panel'
import { faNumber, faMoney } from '@/lib/format'

type HistoryRow = { expr: string; result: string }

const KEYS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '%', '+'],
]

export function CalculatorWidget() {
  const { calcOpen, setCalcOpen } = usePanel()
  const [display, setDisplay] = useState('0')
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [shopPrice, setShopPrice] = useState('')
  const [shopDiscount, setShopDiscount] = useState('')
  const [shopCost, setShopCost] = useState('')
  const exprRef = useRef('')

  // keyboard support
  useEffect(() => {
    if (!calcOpen) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (/^[0-9+\-*/.%]$/.test(e.key)) {
        setDisplay((d) => (d === '0' && /[0-9]/.test(e.key) ? e.key : d + e.key))
      } else if (e.key === 'Enter' || e.key === '=') {
        evaluate()
      } else if (e.key === 'Escape') {
        setDisplay('0')
        exprRef.current = ''
      } else if (e.key === 'Backspace') {
        setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [calcOpen])

  function evaluate() {
    try {
      // percent support: replace "X%" handled at eval via /100
      const sanitized = display.replace(/%/g, '/100')
      const result = Function(`"use strict"; return (${sanitized})`)()
      if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error()
      setHistory((h) => [{ expr: display, result: String(Math.round(result * 1e6) / 1e6) }, ...h].slice(0, 20))
      setDisplay(String(Math.round(result * 1e6) / 1e6))
    } catch {
      setDisplay('خطا')
    }
  }

  const price = parseFloat(shopPrice || '0') || 0
  const discount = parseFloat(shopDiscount || '0') || 0
  const cost = parseFloat(shopCost || '0') || 0
  const finalPrice = Math.round(price * (1 - discount / 100))
  const profit = price > 0 && cost > 0 ? finalPrice - cost : 0
  const margin = cost > 0 ? Math.round((profit / cost) * 100) : 0

  if (!calcOpen) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="w-80 max-w-[calc(100vw-2rem)] border-blue-200 dark:border-slate-700 shadow-2xl shadow-blue-600/10 overflow-hidden">
        <div className="flex items-center justify-between bg-blue-600 text-white px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="w-4 h-4" /> ماشین‌حساب فروشگاه
          </span>
          <button onClick={() => setCalcOpen(false)} aria-label="بستن ماشین‌حساب">
            <X className="w-4 h-4 opacity-80 hover:opacity-100" />
          </button>
        </div>

        <Tabs defaultValue="calc">
          <div className="px-3 pt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="calc" className="flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> استاندارد</TabsTrigger>
              <TabsTrigger value="shop" className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> فروشگاهی</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="calc" className="p-3 space-y-2">
            <div className="rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 px-3 py-2.5 text-left" dir="ltr">
              {exprRef.current && <p className="text-[10px] text-slate-400 text-right" dir="rtl">{exprRef.current}</p>}
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 break-all">{display}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1 text-red-500" onClick={() => { setDisplay('0'); exprRef.current = '' }}>C</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'))}>⌫</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={evaluate}><Equal className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {KEYS.flat().map((k) => (
                <Button
                  key={k}
                  variant="outline"
                  className={`h-10 font-bold ${['+', '-', '*', '/', '%'].includes(k) ? 'text-blue-600' : ''}`}
                  onClick={() => setDisplay((d) => (d === '0' && /[0-9]/.test(k) ? k : d + k))}
                >
                  {k === '/' ? <Divide className="w-4 h-4" /> : k === '*' ? '×' : k === '-' ? <Minus className="w-4 h-4" /> : k === '+' ? <Plus className="w-4 h-4" /> : k === '%' ? <Percent className="w-4 h-4" /> : k}
                </Button>
              ))}
            </div>
            {history.length > 0 && (
              <div className="max-h-28 overflow-y-auto nice-scroll rounded-lg border border-blue-100 dark:border-slate-800 divide-y divide-blue-50 dark:divide-slate-800">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 px-2 py-1"><History className="w-3 h-3" /> تاریخچه</p>
                {history.map((h, i) => (
                  <button
                    key={i}
                    className="w-full flex justify-between px-2 py-1 text-xs hover:bg-blue-50 dark:hover:bg-slate-900"
                    onClick={() => setDisplay(h.result)}
                  >
                    <span dir="ltr" className="text-slate-400">{h.expr}</span>
                    <span dir="ltr" className="font-semibold text-blue-700 dark:text-blue-300">= {h.result}</span>
                  </button>
                ))}
                <button className="w-full flex items-center justify-center gap-1 py-1 text-[11px] text-red-400 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setHistory([])}>
                  <Trash2 className="w-3 h-3" /> پاک‌کردن تاریخچه
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shop" className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">قیمت اصلی</label>
                <Input type="number" dir="ltr" className="text-left h-8" value={shopPrice} onChange={(e) => setShopPrice(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">تخفیف ٪</label>
                <Input type="number" dir="ltr" className="text-left h-8" value={shopDiscount} onChange={(e) => setShopDiscount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">قیمت خرید</label>
                <Input type="number" dir="ltr" className="text-left h-8" value={shopCost} onChange={(e) => setShopCost(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 divide-y divide-blue-100 dark:divide-slate-800">
              <div className="flex justify-between px-3 py-2 text-sm">
                <span className="text-slate-500">قیمت بعد از تخفیف</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{faMoney(finalPrice)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-sm">
                <span className="text-slate-500">سود هر واحد</span>
                <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{faMoney(profit)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-sm">
                <span className="text-slate-500">حاشیه سود</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{faNumber(margin)}٪</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
