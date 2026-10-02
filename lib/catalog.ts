export type Category = {
  slug: string
  name: string
  image: string
  kind: 'type'
}

export type Product = {
  id: string
  brand: string
  name: string
  price: number
  image: string
  images: string[]
  description: string
  age: string
  country?: string
  categories: string[]
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkGc2zEWv2_onV0oN1lRmolJIVb016GLGTPnPAPGvA0NiMUcLefgy_Rbf8-ksKg7vmPr3ATLQvNbdk/pub?gid=0&single=true&output=csv'

const categoryImages: Record<string, string> = {
  'Куклы': '/images/categories/dolls.png',
  'Коляски для кукол': '/images/categories/strollers.png',
  'Коляски': '/images/categories/strollers.png',
  'Развивающие игрушки': '/images/categories/educational.png',
  'Музыкальные игрушки': '/images/categories/musical.png',
  'Мягкие игрушки': '/images/categories/soft-toys.png',
  'Ролевые игры': '/images/categories/role-play.png',
  'Творчество': '/images/categories/creativity.png',
}

function slugify(value: string) {
  const slugs: Record<string, string> = {
    'Куклы': 'dolls',
    'Ролевые игры': 'role-play',
'Музыкальные игрушки': 'musical',
'Творчество': 'creativity',
'Развивающие игрушки': 'educational',
'Для малышей': 'for-babies',
    'Аксессуары': 'accessories',
  }

  return slugs[value.trim()] || value.trim().toLowerCase().replace(/\s+/g, '-')
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field); field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else field += char
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

function isTrue(value: string) {
  return ['true', 'истина', '1', 'yes', 'да'].includes(value.trim().toLowerCase())
}

export async function getCatalog() {
  try {
    const response = await fetch(CSV_URL, { next: { revalidate: 60 } })
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`)
    const rows = parseCSV(await response.text())
    const headers = rows.shift()?.map((h) => h.trim()) ?? []
    const col = (name: string) => headers.indexOf(name)

    const products: Product[] = rows.flatMap((row, index) => {
      const name = row[col('Название')]?.trim() ?? ''
      const brand = row[col('Бренд')]?.trim() ?? ''
      const categoryName = row[col('Категория')]?.trim() ?? ''
      const available = row[col('В наличии')] ?? ''
      if (!name || !categoryName || !isTrue(available)) return []
      const rawId = row[col('ID')]?.trim() || `${slugify(name)}-${index + 2}`
      const price = Number((row[col('Цена')] ?? '0').replace(/\s/g, '').replace(',', '.')) || 0
      return [{
        id: rawId,
        brand,
        name,
        price,
        image: row[col('Фото 1')]?.trim() || '/placeholder.svg',
images: Array.from({ length: 8 }, (_, i) => row[col(`Фото ${i + 1}`)]?.trim()).filter(Boolean) as string[],
        description: row[col('Описание')]?.trim() || '',
        age: row[col('Возраст')]?.trim() || '',
        categories: [slugify(categoryName)],
      }]
    })

    const names = [...new Set(rows
      .filter((row) => isTrue(row[col('В наличии')] ?? ''))
      .map((row) => row[col('Категория')]?.trim())
      .filter(Boolean) as string[])]

    const categories: Category[] = names.map((name) => ({
      slug: slugify(name),
      name,
      image: categoryImages[name] || '/placeholder.svg',
      kind: 'type',
    }))

    return { products, categories }
  } catch (error) {
    console.error('Failed to load bébéhouse catalog:', error)
    return { products: [] as Product[], categories: [] as Category[] }
  }
}

export function searchProducts(products: Product[], query: string, categorySlug?: string) {
  const normalized = query.trim().toLowerCase()
  return products.filter((product) => {
    if (categorySlug && !product.categories.includes(categorySlug)) return false
    if (!normalized) return true
    return product.name.toLowerCase().includes(normalized) || product.brand.toLowerCase().includes(normalized)
  })
}
