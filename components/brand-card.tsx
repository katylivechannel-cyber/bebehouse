import Image from 'next/image'
import Link from 'next/link'
import { productsLabel } from '@/lib/format'

type BrandCardProps = {
  name: string
  slug: string
  image: string
  count: number
  priority?: boolean
}

export function BrandCard({
  name,
  slug,
  image,
  count,
  priority,
}: BrandCardProps) {
  return (
    <Link
      href={`/catalog?brand=${slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={name}
          fill
          priority={priority}
          sizes="(max-width: 448px) 50vw, 224px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-0.5 px-3.5 pb-3.5 pt-3">
        <h3 className="text-pretty font-serif text-lg font-semibold leading-tight">
          {name}
        </h3>

        <p className="text-xs text-muted-foreground">
          {productsLabel(count)}
        </p>
      </div>
    </Link>
  )
}
