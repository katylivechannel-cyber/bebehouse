import Link from 'next/link'
import { CategoryCard } from '@/components/category-card'
import { SearchBar } from '@/components/search-bar'
import { getCatalog } from '@/lib/catalog'

export default async function HomePage() {
  const { categories, products } = await getCatalog()

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
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-2 rounded-[24px] bg-[#FAF7F2] px-5 py-5">
        <p className="font-serif text-xl font-semibold text-[#411D0A]">
          Есть вопросы?
        </p>

        <p className="mt-1 text-sm leading-relaxed text-[#7A6A61]">
          Всё о доставке, оплате, возврате и
          bébéhouse — в одном месте.
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

