import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { AddToCartBar } from '@/components/add-to-cart-bar'
import { ProductGallery } from '@/components/product-gallery'
import { getCatalog } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { products } = await getCatalog()
  const product = products.find(p => p.id === id)
  return { title: product ? `${product.name} — bébéhouse` : 'bébéhouse', description: product?.description }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { products } = await getCatalog()
  const product = products.find(p => p.id === id)
  if (!product) notFound()
  const backHref = `/category/${product.categories[0]}`
  return <main className="flex flex-col gap-6 pb-24">
   <div className="relative -mx-4">
  <ProductGallery images={product.images} name={product.name} />
      <Link href={backHref} className="absolute left-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-background/80">
  <ChevronLeft className="size-5" />
</Link>
</div>
    <section className="flex flex-col gap-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.brand}</p><h1 className="text-balance font-serif text-[30px] font-semibold leading-[1.1]">{product.name}</h1><p className="mt-1 text-2xl font-semibold">{formatPrice(product.price)}</p></section>
    {product.age && <ul className="flex flex-wrap gap-2" aria-label="Характеристики"><li className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground">{product.age}</li></ul>}
    {product.description && <section aria-labelledby="description-title" className="flex flex-col gap-2"><h2 id="description-title" className="font-serif text-xl font-semibold">Описание</h2><p className="text-pretty text-[15px] leading-relaxed text-foreground/80">{product.description}</p></section>}
    <AddToCartBar productId={product.id} price={product.price} />
  </main>
}
