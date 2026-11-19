import type { SessionUser } from '@/store/panel'

export type ProductAttr = { key: string; value: string }

export type Product = {
  id: string
  name: string
  slug: string
  sku: string
  categoryId: string
  category: { id: string; name: string; slug: string }
  brand: string | null
  model: string | null
  salePrice: number
  discountPrice: number | null
  costPrice: number | null
  stock: number
  lowStockThreshold: number
  status: 'DRAFT' | 'PUBLISHED' | 'OUT' | 'ARCHIVED'
  attributes: ProductAttr[]
  images: string[]
  shortDesc: string | null
  longDesc: string | null
  metaTitle: string | null
  metaDesc: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Category = {
  id: string
  name: string
  slug: string
  icon: string | null
  parentId: string | null
  order: number
  active: boolean
  _count?: { products: number }
}

export type Sale = {
  id: string
  productId: string
  product: { name: string; sku: string; images: string[] }
  qty: number
  unitPrice: number
  total: number
  customerName: string | null
  note: string | null
  soldById: string | null
  soldBy?: { name: string } | null
  soldAt: string
  cancelledAt: string | null
  cancelReason: string | null
}

export type Note = {
  id: string
  title: string
  body: string
  color: string
  pinned: boolean
  productId: string | null
  product?: { name: string } | null
  userId: string | null
  createdAt: string
  updatedAt: string
}

export type UserRow = {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  createdAt: string
}

export type DashboardData = {
  kpis: {
    today: { count: number; amount: number }
    week: { count: number; amount: number }
    month: { count: number; amount: number }
    period: { count: number; amount: number }
    growth: number | null
    productsCount: number
    lowStockCount: number
    outStockCount: number
  }
  trend: { date: string; count: number; amount: number }[]
  topProducts: { name: string; qty: number; amount: number }[]
  categoryShares: { name: string; count: number }[]
  recentSales: Sale[]
  alerts: {
    lowStock: { id: string; name: string; stock: number; threshold: number }[]
    noImageCount: number
    noPriceCount: number
    priceCheckedToday: boolean
  }
  notes: Note[]
}

export type PriceHistoryRow = {
  id: string
  productId: string
  oldPrice: number
  newPrice: number
  userId: string | null
  createdAt: string
}

export type SessionPayload = {
  user: SessionUser | null
  storeName?: string
  reminder?: { enabled: boolean; hour: number; minute: number } | null
}

export type SettingsData = {
  setting: {
    storeName: string
    reminderEnabled: boolean
    reminderHour: number
    reminderMinute: number
    webhookUrl: string | null
    currency: string
    apiKey?: string
    geminiConfigured?: boolean
    geminiMasked?: string
    aiProvider?: string
    geminiProxyUrl?: string
  }
}

export type LoginLogRow = {
  id: string
  username: string
  success: boolean
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export type AuditLogRow = {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
}
