import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { ProductGrid } from '@/components/product-card'
import { getCatalog } from '@/lib/catalog'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { categories } = await getCatalog()
  const category = categories.find(c => c.slug === slug)
  return { title: category ? `${category.name} — bébéhouse` : 'bébéhouse' }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { categories, products } = await getCatalog()
  const category = categories.find(c => c.slug === slug)
  if (!category) notFound()
  const items = products.filter(p => p.categories.includes(slug))
  return <main className="flex flex-col gap-6 pb-6"><PageHeader title={category.name} backHref="/" /><ProductGrid products={items} /></main>
}
