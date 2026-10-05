import Link from 'next/link'
import { CategoryCard } from '@/components/category-card'
import { ProductCard } from '@/components/product-card'
import { SearchBar } from '@/components/search-bar'
import { getCatalog } from '@/lib/catalog'
import { BrandCard } from '@/components/brand-card'

export default async function HomePage() {
  const { categories, products } = await getCatalog()

 const newProducts = products.filter(
  (product) =>
    product.isNew && product.quantity > 0
)

const bestsellerProducts = products
  .filter((product) => product.isBestseller)
  .sort((a, b) => {
    const aExpected = a.quantity <= 0 ? 1 : 0
    const bExpected = b.quantity <= 0 ? 1 : 0

    return aExpected - bExpected
  })

  return (
    <main className="flex flex-col gap-7 pb-6">
      <header className="flex flex-col items-center gap-2 pt-8 text-center">
        <p className="font-serif text-[44px] font-semibold leading-none tracking-tight">
          bébéhouse
        </p>

        <div
          className="flex items-center gap-2"
          aria-hidden="true"
        >
          <span className="size-1.5 rounded-full bg-secondary" />
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="size-1.5 rounded-full bg-secondary" />
        </div>

        <h1 className="text-balance text-sm text-muted-foreground">
          Детские европейские бренды в одном месте
        </h1>
      </header>

      <SearchBar />

      {newProducts.length > 0 && (
        <section
          aria-labelledby="new-products-title"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-4">
            <h2
              id="new-products-title"
              className="font-serif text-[28px] font-semibold leading-none"
            >
              Новинки
            </h2>

           <Link
  href="/catalog?collection=new"
              className="shrink-0 text-sm text-muted-foreground underline underline-offset-4"
            >
              Смотреть все
            </Link>
          </div>

          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newProducts.map((product, index) => (
              <li
                key={product.id}
                className="w-[44%] shrink-0 snap-start"
              >
                <ProductCard
                  product={product}
                  priority={index < 2}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {bestsellerProducts.length > 0 && (
        <section
          aria-labelledby="bestsellers-title"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-4">
            <h2
              id="bestsellers-title"
              className="font-serif text-[28px] font-semibold leading-none"
            >
              Бестселлеры
            </h2>

           <Link
  href="/catalog?collection=bestseller"
              className="shrink-0 text-sm text-muted-foreground underline underline-offset-4"
            >
              Смотреть все
            </Link>
          </div>

          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bestsellerProducts.map((product, index) => (
              <li
                key={product.id}
                className="w-[44%] shrink-0 snap-start"
              >
                <ProductCard
                  product={product}
                  priority={
                    newProducts.length === 0 && index < 2
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="categories-title"
        className="flex flex-col gap-4"
      >
        <h2
          id="categories-title"
          className="font-serif text-[28px] font-semibold leading-none"
        >
          Категории
        </h2>

        <ul className="grid grid-cols-2 gap-3">
          {categories.map((category, index) => (
            <li key={category.slug}>
              <CategoryCard
                category={category}
                count={
                  products.filter((product) =>
                    product.categories.includes(
                      category.slug
                    )
                  ).length
                }
                priority={
                  newProducts.length === 0 &&
                  bestsellerProducts.length === 0 &&
                  index < 4
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section
  aria-labelledby="brands-title"
  className="flex flex-col gap-4"
>
  <h2
    id="brands-title"
    className="font-serif text-[28px] font-semibold leading-none"
  >
    Бренды
  </h2>

  <ul className="grid grid-cols-2 gap-3">
    <li>
      <BrandCard
        name="Little Dutch"
        slug="little-dutch"
        image="/images/categories/little-dutch.png"
        count={
          products.filter(
            (product) =>
              product.brand
                .trim()
                .toLowerCase() ===
              'little dutch'
          ).length
        }
      />
    </li>

    <li>
      <BrandCard
        name="Konges Sløjd"
        slug="konges-slojd"
        image="/images/categories/konges-slojd.png"
       count={
  products.filter((product) => {
    const brand = product.brand
      .trim()
      .toLowerCase()

    return (
      brand === 'konges sløjd' ||
      brand === 'konges slojd'
    )
  }).length
}
      />
    </li>

    <li>
      <BrandCard
        name="Élhée"
        slug="elhee"
        image="/images/categories/elhee.png"
        count={
  products.filter((product) => {
    const brand = product.brand
      .trim()
      .toLowerCase()

    return (
      brand === 'élhée' ||
      brand === 'elhee' ||
      brand === 'elhee baby'
    )
  }).length
}
      />
    </li>
  </ul>
</section>
      
      <section className="mt-2 rounded-[24px] bg-[#FAF7F2] px-5 py-5">
        <p className="font-serif text-xl font-semibold text-[#411D0A]">
          Есть вопросы?
        </p>

        <p className="mt-1 text-sm leading-relaxed text-[#7A6A61]">
          Всё о доставке, оплате, возврате и bébéhouse — в
          одном месте.
        </p>

        <Link
          href="/info"
          className="mt-4 inline-flex items-center text-sm font-medium text-[#411D0A] underline decoration-[#D9CFC7] underline-offset-4"
        >
          Информация для покупателей
        </Link>
      </section>
    </main>
  )
}
