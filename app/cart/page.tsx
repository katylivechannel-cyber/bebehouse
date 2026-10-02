import type { Metadata } from 'next'
import { CartView } from '@/components/cart-view'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Корзина — bébéhouse' }

export default function CartPage() {
  return (
    <main className="flex flex-col gap-5 pb-6">
      <PageHeader title="Корзина" />
      <CartView />
    </main>
  )
}
