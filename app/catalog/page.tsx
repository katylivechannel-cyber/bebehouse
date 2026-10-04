import type { Metadata } from 'next'
import { CatalogView } from '@/components/catalog-view'
import { PageHeader } from '@/components/page-header'
import { getCatalog } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Каталог — bébéhouse',
}

type Collection = 'new' | 'bestseller'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    collection?: Collection
  }>
}) {
  const { q, collection } = await searchParams
  const { products, categories } = await getCatalog()

  const collectionProducts =
    collection === 'new'
      ? products.filter(
          (product) =>
            product.isNew && product.quantity > 0
        )
      : collection === 'bestseller'
        ? products
            .filter(
              (product) => product.isBestseller
            )
            .sort((a, b) => {
              const aExpected =
                a.quantity <= 0 ? 1 : 0
              const bExpected =
                b.quantity <= 0 ? 1 : 0

              return aExpected - bExpected
            })
        : products

  const title =
    collection === 'new'
      ? 'Новинки'
      : collection === 'bestseller'
        ? 'Бестселлеры'
        : 'Каталог'

  return (
    <main className="flex flex-col gap-5 pb-6">
      <PageHeader title={title} />

      <CatalogView
        key={`${q ?? ''}-${collection ?? ''}`}
        initialQuery={q ?? ''}
        products={collectionProducts}
        categories={categories}
      />
    </main>
  )
}
