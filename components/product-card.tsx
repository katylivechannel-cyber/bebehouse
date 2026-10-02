import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
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
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 text-sm leading-snug">{product.name}</h3>
        <p className="mt-0.5 text-[15px] font-semibold">{formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  )
}
