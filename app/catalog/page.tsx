import type { Metadata } from 'next'
import { CatalogView } from '@/components/catalog-view'
import { PageHeader } from '@/components/page-header'
import { getCatalog } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Каталог — bébéhouse',
}

type Collection = 'new' | 'bestseller'

const brands: Record<
  string,
  {
    name: string
    aliases: string[]
  }
> = {
  'little-dutch': {
    name: 'Little Dutch',
    aliases: ['little dutch'],
  },

  'konges-slojd': {
    name: 'Konges Sløjd',
    aliases: [
      'konges sløjd',
      'konges slojd',
    ],
  },

  elhee: {
    name: 'Élhée',
    aliases: [
      'élhée',
      'elhee',
    ],
  },
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    collection?: Collection
    brand?: string
  }>
}) {
  const {
    q,
    collection,
    brand,
  } = await searchParams

  const { products, categories } =
    await getCatalog()

  const selectedBrand = brand
    ? brands[brand]
    : undefined

  let filteredProducts = products

  if (collection === 'new') {
    filteredProducts = products.filter(
      (product) =>
        product.isNew &&
        product.quantity > 0
    )
  }

  if (collection === 'bestseller') {
    filteredProducts = products
      .filter(
        (product) =>
          product.isBestseller
      )
      .sort((a, b) => {
        const aExpected =
          a.quantity <= 0 ? 1 : 0

        const bExpected =
          b.quantity <= 0 ? 1 : 0

        return aExpected - bExpected
      })
  }

  if (selectedBrand) {
    filteredProducts =
      filteredProducts.filter(
        (product) => {
          const productBrand =
            product.brand
              .trim()
              .toLowerCase()

          return selectedBrand.aliases.includes(
            productBrand
          )
        }
      )
  }

  const title = selectedBrand
    ? selectedBrand.name
    : collection === 'new'
      ? 'Новинки'
      : collection === 'bestseller'
        ? 'Бестселлеры'
        : 'Каталог'

  const showBackButton =
    Boolean(collection) ||
    Boolean(selectedBrand)

  return (
    <main className="flex flex-col gap-5 pb-6">
      <PageHeader
        title={title}
        backHref={
          showBackButton
            ? '/'
            : undefined
        }
      />

      <CatalogView
        key={`${q ?? ''}-${collection ?? ''}-${brand ?? ''}`}
        initialQuery={q ?? ''}
        products={filteredProducts}
        categories={categories}
      />
    </main>
  )
}
