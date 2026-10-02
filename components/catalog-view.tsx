'use client'

import { useState } from 'react'
import { SearchBar } from '@/components/search-bar'
import { ProductGrid } from '@/components/product-card'
import { searchProducts, type Product, type Category } from '@/lib/catalog'
import { productsLabel } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/utils'

export function CatalogView({ initialQuery, products, categories }: { initialQuery: string; products: Product[]; categories: Category[] }) {
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string | undefined>()
  const results = searchProducts(products, query, activeCategory)

  const chips = [{ slug: undefined, name: 'Все' }, ...categories]

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={query} onChange={setQuery} />

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2" aria-label="Фильтр по категориям">
          {chips.map((chip) => {
            const active = chip.slug === activeCategory
            return (
              <li key={chip.slug ?? 'all'}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setActiveCategory(chip.slug)
                    haptic('soft')
                  }}
                  className={cn(
                    'h-9 whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground active:bg-muted',
                  )}
                >
                  {chip.name}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {productsLabel(results.length)}
      </p>

      {results.length > 0 ? (
        <ProductGrid products={results} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-card px-6 py-12 text-center">
          <p className="font-serif text-xl font-semibold">Ничего не нашлось</p>
          <p className="text-sm text-muted-foreground">
            Попробуйте изменить запрос или выбрать другую категорию
          </p>
        </div>
      )}
    </div>
  )
}
