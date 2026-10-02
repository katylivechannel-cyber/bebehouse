'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

export function ProductGallery({
  images,
  name,
}: {
  images: string[]
  name: string
}) {
  const gallery = images.length > 0 ? images : ['/placeholder.svg']
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  return (
    <div
  className="relative aspect-square overflow-hidden rounded-b-[2.5rem] bg-muted"
  onTouchStart={(e) => {
    touchStartX.current = e.touches[0].clientX
  }}
  onTouchEnd={(e) => {
    if (touchStartX.current === null) return

    const difference = touchStartX.current - e.changedTouches[0].clientX

    if (difference > 50) {
      setCurrent((current + 1) % gallery.length)
    }

    if (difference < -50) {
      setCurrent((current - 1 + gallery.length) % gallery.length)
    }

    touchStartX.current = null
  }}
>
        <Image
          src={gallery[current]}
          alt={`${name} — фото ${current + 1}`}
          fill
          priority
          className="object-cover"
        />
      </div>

      {gallery.length > 1 && (
        <div className="flex justify-center gap-2">
          {gallery.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Фото ${index + 1}`}
              className={`h-2 rounded-full transition-all ${
                current === index ? 'w-6 bg-foreground' : 'w-2 bg-foreground/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
