import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductBackButton } from '@/components/product-back-button'
import { AddToCartBar } from '@/components/add-to-cart-bar'
import { ProductGallery } from '@/components/product-gallery'
import { getCatalog } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { products } = await getCatalog()

  const product = products.find(
    (product) => product.id === id
  )

  return {
    title: product
      ? `${product.name} — bébéhouse`
      : 'bébéhouse',
    description: product?.description,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { products } = await getCatalog()

  const product = products.find(
    (product) => product.id === id
  )

  if (!product) notFound()

  return (
    <main className="flex flex-col gap-6 pb-24">
      <div className="relative -mx-4">
        <ProductGallery
          images={product.images}
          name={product.name}
        />

        <ProductBackButton />
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {product.brand}
        </p>

        <h1 className="text-balance font-serif text-[30px] font-semibold leading-[1.1]">
          {product.name}
        </h1>

        <p className="mt-1 text-2xl font-semibold">
          {formatPrice(product.price)}
        </p>

        {product.quantity > 0 ? (
          <p className="mt-1 text-sm font-medium text-foreground/70">
            В наличии: {product.quantity} шт.
          </p>
        ) : product.expectedDate ? (
          <p className="mt-1 text-sm font-medium text-foreground/70">
            Поступление ожидается {product.expectedDate}
          </p>
        ) : null}
      </section>

      {product.age && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label="Характеристики"
        >
          <li className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground">
            {product.age}
          </li>
        </ul>
      )}

      {product.description && (
        <section
          aria-labelledby="description-title"
          className="flex flex-col gap-2"
        >
          <h2
            id="description-title"
            className="font-serif text-xl font-semibold"
          >
            Описание
          </h2>

          <p className="text-pretty text-[15px] leading-relaxed text-foreground/80">
            {product.description}
          </p>
        </section>
      )}

      {product.size && (
        <section className="rounded-2xl bg-[#FAF7F2] px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Размер
          </p>

          <p className="mt-1 font-serif text-[18px] font-semibold text-foreground">
            {product.size}
          </p>
        </section>
      )}

      <AddToCartBar
        productId={product.id}
        price={product.price}
        availableQuantity={product.quantity}
      />
    </main>
  )
}
