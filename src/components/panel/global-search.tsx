'use client'

import { useEffect, useState } from 'react'
import { Search, Package, FolderTree, StickyNote } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { usePanel } from '@/store/panel'
import { api } from '@/lib/api'
import type { Category, Note, Product } from '@/lib/client-types'
import { faMoney } from '@/lib/format'

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, setView } = usePanel()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!searchOpen) return
    const t = setTimeout(async () => {
      try {
        const [p, c, n] = await Promise.all([
          api<{ items: Product[] }>(`/api/products?perPage=8${q ? `&search=${encodeURIComponent(q)}` : ''}`),
          api<{ categories: Category[] }>('/api/categories'),
          api<{ notes: Note[] }>(`/api/notes${q ? `?search=${encodeURIComponent(q)}` : ''}`),
        ])
        setProducts(p.items)
        setCategories(c.categories.slice(0, 6))
        setNotes(n.notes.slice(0, 5))
      } catch {
        // silent
      }
    }, 200)
    return () => clearTimeout(t)
  }, [q, searchOpen])

  function go(view: Parameters<typeof setView>[0]) {
    setView(view)
    setSearchOpen(false)
    setQ('')
  }

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput placeholder="جستجوی محصول، دسته‌بندی یا یادداشت..." value={q} onValueChange={setQ} />
      <CommandList className="nice-scroll">
        <CommandEmpty>نتیجه‌ای پیدا نشد</CommandEmpty>
        {products.length > 0 && (
          <CommandGroup heading="محصولات">
            {products.map((p) => (
              <CommandItem key={p.id} onSelect={() => go('products')} className="gap-2">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-7 h-7 rounded object-cover bg-blue-50" />
                ) : (
                  <span className="flex items-center justify-center w-7 h-7 rounded bg-blue-50 dark:bg-slate-900">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                  </span>
                )}
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-slate-400">{faMoney(p.salePrice)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {categories.length > 0 && (
          <CommandGroup heading="دسته‌بندی‌ها">
            {categories.map((c) => (
              <CommandItem key={c.id} onSelect={() => go('categories')}>
                <FolderTree className="w-4 h-4 text-blue-500" />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {notes.length > 0 && (
          <CommandGroup heading="یادداشت‌ها">
            {notes.map((n) => (
              <CommandItem key={n.id} onSelect={() => go('notes')}>
                <StickyNote className="w-4 h-4 text-blue-500" />
                <span className="truncate">{n.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="برو به">
          <CommandItem onSelect={() => go('dashboard')}>
            <Search className="w-4 h-4" /> داشبورد
          </CommandItem>
          <CommandItem onSelect={() => go('sales')}>
            <Search className="w-4 h-4" /> تاریخچه فروش
          </CommandItem>
          <CommandItem onSelect={() => go('settings')}>
            <Search className="w-4 h-4" /> تنظیمات
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
