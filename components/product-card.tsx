import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'

export function ProductCard({
  product,
  priority,
}: {
  product: Product
  priority?: boolean
}) {
  const isExpected =
    product.quantity <= 0 && product.expectedDate

  const secondImage = product.images?.[1]

  const dimensions = [
    product.length,
    product.width,
    product.height,
  ].filter(
    (value): value is number =>
      typeof value === 'number' && value > 0
  )

  const sizeLabel =
    dimensions.length > 0
      ? `${dimensions.join(' × ')} см`
      : null

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col gap-2.5 transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/60 bg-card">
        <Image
          src={product.image || '/placeholder.svg'}
          alt={product.name}
          fill
          priority={priority}
          sizes="(max-width: 448px) 50vw, 224px"
          className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
        />

        {secondImage && (
          <Image
            src={secondImage}
            alt={product.name}
            fill
            sizes="(max-width: 448px) 50vw, 224px"
            className="object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        )}

        {isExpected && (
          <div className="absolute bottom-2 left-2 right-2 z-10 rounded-full bg-background/90 px-3 py-1.5 text-center text-[11px] font-medium text-foreground backdrop-blur-sm">
            Ожидается {product.expectedDate}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {product.brand}
        </p>

        <h3 className="line-clamp-2 text-sm leading-snug">
          {product.name}
        </h3>

        {sizeLabel && (
          <div className="mt-1">
            <span className="inline-flex rounded-full bg-[#F1EAE1] px-2.5 py-1 text-[11px] font-medium text-[#7A6A61]">
              {sizeLabel}
            </span>
          </div>
        )}

        <p className="mt-1 text-[15px] font-semibold">
          {formatPrice(product.price)}
        </p>

        {isExpected && (
          <p className="mt-1 text-xs text-muted-foreground">
            Нет в наличии
          </p>
        )}
      </div>
    </Link>
  )
}

export function ProductGrid({
  products,
}: {
  products: Product[]
}) {
  const sortedProducts = [...products].sort(
    (a, b) => {
      const aExpected = a.quantity <= 0 ? 1 : 0
      const bExpected = b.quantity <= 0 ? 1 : 0

      return aExpected - bExpected
    }
  )

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
      {sortedProducts.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={index < 4}
          />
        </li>
      ))}
    </ul>
  )
}
