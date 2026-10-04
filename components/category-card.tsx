import Image from 'next/image'
import Link from 'next/link'
import type { Category } from '@/lib/catalog'
import { productsLabel } from '@/lib/format'

export function CategoryCard({
  category,
  count,
  priority,
}: {
  category: Category
  count: number
  priority?: boolean
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={category.image || '/placeholder.svg'}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 448px) 50vw, 224px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {category.kind === 'brand' && (
          <span className="absolute left-3 top-3 rounded-full bg-accent/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground backdrop-blur">
            Бренд
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-3.5 pb-3.5 pt-3">
        <h3 className="text-pretty font-serif text-lg font-semibold leading-tight">
          {category.name}
        </h3>

        <p className="text-xs text-muted-foreground">
          {productsLabel(count)}
        </p>
      </div>
    </Link>
  )
}
