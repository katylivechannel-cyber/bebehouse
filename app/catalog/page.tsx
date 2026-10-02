import type { Metadata } from 'next'
import { CatalogView } from '@/components/catalog-view'
import { PageHeader } from '@/components/page-header'
import { getCatalog } from '@/lib/catalog'
export const metadata: Metadata = { title: 'Каталог — bébéhouse' }
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const { products, categories } = await getCatalog()
  return <main className="flex flex-col gap-5 pb-6"><PageHeader title="Каталог" /><CatalogView key={q ?? ''} initialQuery={q ?? ''} products={products} categories={categories} /></main>
}
