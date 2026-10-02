'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { Product } from '@/lib/catalog'

type CartLine = { product: Product; quantity: number }

type CartContextValue = {
  lines: CartLine[]
  count: number
  total: number
  quantityOf: (productId: string) => number
  add: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const MAX_QUANTITY = 20

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children, products }: { children: React.ReactNode; products: Product[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setQuantities((current) => {
      const next = { ...current }
      const clamped = Math.min(Math.max(Math.floor(quantity), 0), MAX_QUANTITY)
      if (clamped === 0) delete next[productId]
      else next[productId] = clamped
      return next
    })
  }, [])

  const add = useCallback((productId: string) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.min((current[productId] ?? 0) + 1, MAX_QUANTITY),
    }))
  }, [])

  const remove = useCallback((productId: string) => setQuantity(productId, 0), [setQuantity])
  const clear = useCallback(() => setQuantities({}), [])

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(quantities).flatMap(([id, quantity]) => {
      const product = products.find((item) => item.id === id)
      return product ? [{ product, quantity }] : []
    })
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0),
      quantityOf: (productId) => quantities[productId] ?? 0,
      add,
      setQuantity,
      remove,
      clear,
    }
  }, [quantities, add, setQuantity, remove, clear, products])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
