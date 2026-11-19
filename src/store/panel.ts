'use client'

import { create } from 'zustand'

export type PanelView =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'sales'
  | 'notes'
  | 'users'
  | 'settings'

export type SessionUser = {
  id: string
  username: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'VIEWER'
}

interface PanelState {
  view: PanelView
  setView: (v: PanelView) => void
  session: SessionUser | null
  setSession: (s: SessionUser | null) => void
  storeName: string
  setStoreName: (s: string) => void
  calcOpen: boolean
  setCalcOpen: (b: boolean) => void
  searchOpen: boolean
  setSearchOpen: (b: boolean) => void
  reminderOpen: boolean
  setReminderOpen: (b: boolean) => void
  priceEditOpen: boolean
  setPriceEditOpen: (b: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** bumped after mutations so views refetch */
  dataVersion: number
  bumpData: () => void
  /** category id to auto-apply as products filter on next ProductsView mount */
  pendingCategoryFilter: string | null
  /** go to products view pre-filtered by a category */
  openCategoryProducts: (categoryId: string) => void
}

export const usePanel = create<PanelState>((set) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v }),
  session: null,
  setSession: (s) => set({ session: s }),
  storeName: 'فروشگاه موبایل',
  setStoreName: (s) => set({ storeName: s }),
  calcOpen: false,
  setCalcOpen: (b) => set({ calcOpen: b }),
  searchOpen: false,
  setSearchOpen: (b) => set({ searchOpen: b }),
  reminderOpen: false,
  setReminderOpen: (b) => set({ reminderOpen: b }),
  priceEditOpen: false,
  setPriceEditOpen: (b) => set({ priceEditOpen: b }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  dataVersion: 0,
  bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  pendingCategoryFilter: null,
  openCategoryProducts: (categoryId) => set({ pendingCategoryFilter: categoryId, view: 'products' }),
}))

export function canDo(role: SessionUser['role'] | undefined | null, perm: string): boolean {
  if (!role) return false
  const perms: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['product.*', 'category.*', 'sale.*', 'note.*', 'report.view', 'settings.manage', 'export.run', 'import.run', 'user.manage'],
    STAFF: ['product.view', 'category.view', 'sale.create', 'note.*', 'report.view'],
    VIEWER: ['product.view', 'category.view', 'report.view'],
  }
  const list = perms[role] || []
  if (list.includes('*')) return true
  if (list.includes(perm)) return true
  const domain = perm.split('.')[0]
  return list.includes(`${domain}.*`)
}
