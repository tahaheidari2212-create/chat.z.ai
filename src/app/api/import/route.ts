import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit, guard, jsonError } from '@/lib/api-helpers'
import { slugify, randomSku } from '@/lib/format'

/**
 * CSV product import. Columns (by header name, Persian or fallback order):
 * name, sku, category, salePrice, stock
 */
export async function POST(req: NextRequest) {
  const g = await guard('import.run')
  if ('resp' in g) return g.resp

  const text = await req.text()
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return jsonError('فایل CSV خالی است')

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') inQ = false
        else cur += ch
      } else if (ch === '"') inQ = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const idx = (...names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)))

  const iName = idx('نام', 'name')
  const iSku = idx('sku', 'کد')
  const iCat = idx('دسته', 'category')
  const iPrice = idx('قیمت', 'price')
  const iStock = idx('موجودی', 'stock')
  const iBrand = idx('برند', 'brand')

  if (iName < 0) return jsonError('ستون «نام» در فایل پیدا نشد')

  const categories = await db.category.findMany()
  let created = 0
  const errors: string[] = []

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const name = cells[iName] || ''
    if (!name) { errors.push(`ردیف بدون نام: ${line.slice(0, 30)}`); continue }

    const catName = iCat >= 0 ? cells[iCat] || 'دسته‌بندی نشده' : 'دسته‌بندی نشده'
    let category = categories.find((c) => c.name === catName)
    if (!category) {
      category = await db.category.create({
        data: { name: catName, slug: slugify(catName) || `cat-${Date.now()}` },
      })
      categories.push(category)
    }

    let sku = (iSku >= 0 && cells[iSku]) || randomSku()
    if (await db.product.findUnique({ where: { sku } })) sku = randomSku()

    let slug = slugify(name) || randomSku('P')
    if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now()}`

    await db.product.create({
      data: {
        name,
        slug,
        sku,
        categoryId: category.id,
        brand: iBrand >= 0 ? cells[iBrand] || null : null,
        salePrice: iPrice >= 0 ? Math.max(0, parseInt(cells[iPrice]?.replace(/[^\d]/g, '') || '0', 10) || 0) : 0,
        stock: iStock >= 0 ? Math.max(0, parseInt(cells[iStock] || '0', 10) || 0) : 0,
        createdBy: g.user.id,
      },
    })
    created += 1
  }

  await audit(g.user.id, 'product.import', 'product', undefined, `${created} created, ${errors.length} errors`)
  return NextResponse.json({ ok: true, created, errors: errors.slice(0, 10) })
}
