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
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return

    const index = Math.round(el.scrollLeft / el.clientWidth)
    setCurrent(index)
  }

  const goTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return

    el.scrollTo({
      left: index * el.clientWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-b-[2.5rem] bg-muted"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        {gallery.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="relative h-full min-w-full shrink-0 snap-center"
          >
            <Image
              src={src}
              alt={`${name} — фото ${index + 1}`}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {gallery.length > 1 && (
        <div className="flex justify-center gap-2">
          {gallery.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Фото ${index + 1}`}
              className={`h-2 rounded-full transition-all ${
                current === index
                  ? 'w-6 bg-foreground'
                  : 'w-2 bg-foreground/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
