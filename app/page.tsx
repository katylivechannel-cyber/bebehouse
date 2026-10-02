import { CategoryCard } from '@/components/category-card'
import { SearchBar } from '@/components/search-bar'
import { getCatalog } from '@/lib/catalog'

export default async function HomePage() {
  const { categories, products } = await getCatalog()
  return (
    <main className="flex flex-col gap-7 pb-6">
      <header className="flex flex-col items-center gap-2 pt-8 text-center">
        <p className="font-serif text-[44px] font-semibold leading-none tracking-tight">bébéhouse</p>
        <div className="flex items-center gap-2" aria-hidden="true"><span className="size-1.5 rounded-full bg-secondary" /><span className="size-1.5 rounded-full bg-accent" /><span className="size-1.5 rounded-full bg-secondary" /></div>
        <h1 className="text-balance text-sm text-muted-foreground">Детские европейские бренды в одном месте</h1>
      </header>
      <SearchBar />
      <section aria-labelledby="categories-title" className="flex flex-col gap-4">
        <h2 id="categories-title" className="font-serif text-[28px] font-semibold leading-none">Категории</h2>
        <ul className="grid grid-cols-2 gap-3">
          {categories.map((category, index) => (
            <li key={category.slug}><CategoryCard category={category} count={products.filter(p => p.categories.includes(category.slug)).length} priority={index < 4} /></li>
          ))}
        </ul>
      </section>
    </main>
  )
}
