'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { faNumber } from '@/lib/format'

/** Lightbox gallery for a product's images (main image + extra angles). Mount only when open. */
export function ProductGalleryDialog({
  productName, images, startIndex, onClose,
}: {
  productName: string
  images: string[]
  startIndex?: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(() => Math.min(startIndex ?? 0, Math.max(0, images.length - 1)))

  useEffect(() => {
    if (images.length < 2) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIdx((i) => (i - 1 + images.length) % images.length) // RTL: right = previous
      if (e.key === 'ArrowLeft') setIdx((i) => (i + 1) % images.length) // RTL: left = next
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length])

  if (!images.length) return null

  const safeIdx = Math.min(idx, images.length - 1)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl nice-scroll">
        <DialogHeader>
          <DialogTitle className="text-right">{productName}</DialogTitle>
          <DialogDescription className="text-right">
            {images.length > 1 ? `گالری تصاویر — ${faNumber(images.length)} عکس` : 'تصویر محصول'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square sm:aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden">
          <img
            src={images[safeIdx]}
            alt={`${productName} — تصویر ${faNumber(safeIdx + 1)}`}
            className="w-full h-full object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-slate-800 shadow flex items-center justify-center transition-colors"
                aria-label="تصویر قبلی"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => setIdx((i) => (i + 1) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-slate-800 shadow flex items-center justify-center transition-colors"
                aria-label="تصویر بعدی"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="absolute bottom-2 right-1/2 translate-x-1/2 bg-black/60 text-white text-xs rounded-full px-3 py-1">
                {faNumber(safeIdx + 1)} از {faNumber(images.length)}
              </span>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto nice-scroll pb-1">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === safeIdx
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={`نمایش تصویر ${faNumber(i + 1)}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
