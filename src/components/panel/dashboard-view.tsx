'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import {
  ShoppingCart, Wallet, Package, PackageX, TrendingUp, TrendingDown,
  AlertTriangle, ImageOff, Tag, Plus, Calculator, StickyNote, ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePanel } from '@/store/panel'
import { api } from '@/lib/api'
import type { DashboardData } from '@/lib/client-types'
import { faMoney, faNumber, jalaliDateTime, shortJalaliDate } from '@/lib/format'

const DONUT_COLORS = ['#2563eb', '#38bdf8', '#0ea5e9', '#7c9cf5', '#6366f1']

function KpiCard({
  title, value, sub, icon: Icon, tone = 'blue',
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  tone?: 'blue' | 'sky' | 'green' | 'red'
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-600 text-white',
    sky: 'bg-sky-500 text-white',
    green: 'bg-emerald-500 text-white',
    red: 'bg-red-500 text-white',
  }
  return (
    <Card className="border-blue-100 dark:border-slate-800">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { setView, setCalcOpen, bumpData, dataVersion, session } = usePanel()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<DashboardData>(`/api/dashboard?days=${days}`))
    } catch {
      // handled by UI state
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load, dataVersion])

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }
  if (!data) return <p className="text-sm text-slate-400">خطا در بارگذاری داشبورد</p>

  const { kpis, trend, topProducts, categoryShares, recentSales, alerts } = data
  const trendLabel: Record<number, string> = { 7: '۷ روز اخیر', 30: '۳۰ روز اخیر', 90: '۹۰ روز اخیر' }
  const canSell = ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(session?.role || '')

  return (
    <div className="space-y-5">
      {/* header + range filter + quick actions */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">داشبورد فروش</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            نمای کلی عملکرد فروشگاه در {trendLabel[days] || `${days} روز اخیر`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              className={days === d ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setDays(d)}
            >
              {d} روز
            </Button>
          ))}
          {canSell && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setView('products')}>
              <Plus className="w-4 h-4" /> ثبت فروش جدید
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setCalcOpen(true)}>
            <Calculator className="w-4 h-4" /> ماشین‌حساب
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="فروش امروز"
          value={faNumber(kpis.today.count)}
          sub={faMoney(kpis.today.amount)}
          icon={ShoppingCart}
          tone="blue"
        />
        <KpiCard
          title="مبلغ فروش (۷ روز اخیر)"
          value={faMoney(kpis.week.amount)}
          sub={`${faNumber(kpis.week.count)} فروش`}
          icon={Wallet}
          tone="sky"
        />
        <KpiCard
          title="مبلغ فروش (۳۰ روز اخیر)"
          value={faMoney(kpis.month.amount)}
          sub={`${faNumber(kpis.month.count)} فروش`}
          icon={Wallet}
          tone="green"
        />
        <KpiCard
          title="محصولات"
          value={faNumber(kpis.productsCount)}
          sub={`${faNumber(kpis.lowStockCount)} کم‌موجودی · ${faNumber(kpis.outStockCount)} ناموجود`}
          icon={Package}
          tone={kpis.outStockCount > 0 ? 'red' : 'blue'}
        />
      </div>

      {/* alerts */}
      {(!alerts.priceCheckedToday || alerts.lowStock.length > 0 || alerts.noImageCount > 0 || alerts.noPriceCount > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {!alerts.priceCheckedToday && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <Tag className="w-4 h-4 shrink-0" />
              قیمت امروز بررسی نشده است
            </div>
          )}
          {alerts.lowStock.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {alerts.lowStock.map((p) => `${p.name} (${faNumber(p.stock)})`).join('، ')} — کم‌موجودی
            </div>
          )}
          {alerts.noImageCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
              <ImageOff className="w-4 h-4 shrink-0" />
              {faNumber(alerts.noImageCount)} محصول بدون تصویر
            </div>
          )}
          {alerts.noPriceCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
              <Tag className="w-4 h-4 shrink-0" />
              {faNumber(alerts.noPriceCount)} محصول بدون قیمت
            </div>
          )}
        </div>
      )}

      {/* trend chart */}
      <Card className="border-blue-100 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">روند فروش روزانه</CardTitle>
          {kpis.growth !== null && (
            <Badge
              variant="secondary"
              className={kpis.growth >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}
            >
              {kpis.growth >= 0 ? <TrendingUp className="w-3 h-3 ml-1" /> : <TrendingDown className="w-3 h-3 ml-1" />}
              {faNumber(Math.abs(kpis.growth))}٪ نسبت به بازه قبل
            </Badge>
          )}
        </CardHeader>
        <CardContent dir="ltr" className="h-72 pr-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => shortJalaliDate(d)}
                tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                tick={{ fontSize: 11 }}
                width={44}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'amount'
                    ? [faMoney(value), 'مبلغ فروش']
                    : [faNumber(value), 'تعداد فروش']
                }
                labelFormatter={(d: string) => jalaliDateTime(d).slice(0, 15)}
                contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: 12, direction: 'rtl' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#amountGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 min-w-0">
        {/* category donut */}
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">سهم فروش هر دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {categoryShares.length === 0 ? (
              <p className="text-sm text-slate-400 text-center pt-16">در این بازه فروشی ثبت نشده است</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryShares}
                    dataKey="count"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                  >
                    {categoryShares.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [`${faNumber(v)} فروش`, n]}
                    contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: 12, direction: 'rtl' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {categoryShares.map((c, i) => (
                <span key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* top products */}
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">پرفروش‌ترین محصولات</CardTitle>
          </CardHeader>
          <CardContent className="h-64" dir="ltr">
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center pt-16">داده‌ای موجود نیست</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${faNumber(v)} عدد`, 'فروش']}
                    contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: 12, direction: 'rtl' }}
                  />
                  <Bar dataKey="qty" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 min-w-0">
        {/* recent sales */}
        <Card className="border-blue-100 dark:border-slate-800 lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">آخرین فروش‌ها</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => setView('sales')}>
              همه <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto nice-scroll">
            {recentSales.length === 0 && <p className="text-sm text-slate-400">فروشی ثبت نشده است</p>}
            {recentSales.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  s.cancelledAt
                    ? 'border-slate-200 dark:border-slate-800 opacity-60'
                    : 'border-blue-100 dark:border-slate-800'
                }`}
              >
                {s.product.images[0] ? (
                  <img src={s.product.images[0]} alt={s.product.name} className="w-9 h-9 rounded-md object-cover bg-blue-50" />
                ) : (
                  <span className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 dark:bg-slate-900">
                    <Package className="w-4 h-4 text-blue-400" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {s.product.name} <span className="text-slate-400">× {faNumber(s.qty)}</span>
                  </p>
                  <p className="text-xs text-slate-400">{jalaliDateTime(s.soldAt)}{s.soldBy ? ` — ${s.soldBy.name}` : ''}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">{faMoney(s.total)}</p>
                  {s.cancelledAt && <p className="text-[11px] text-red-500">لغو شده</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* notes widget */}
        <Card className="border-blue-100 dark:border-slate-800 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">آخرین یادداشت‌ها</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => setView('notes')}>
              همه <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto nice-scroll">
            {data.notes.length === 0 && (
              <div className="text-center py-8">
                <StickyNote className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">هنوز یادداشتی ندارید</p>
              </div>
            )}
            {data.notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-blue-100 dark:border-slate-800 px-3 py-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  {n.pinned && <span className="text-blue-600">سنجاق</span>}
                  {n.title}
                </p>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{n.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
