'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Product } from '@/lib/catalog'

type CartLine = {
  product: Product
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  total: number
  quantityOf: (productId: string) => number
  add: (productId: string) => void
  setQuantity: (
    productId: string,
    quantity: number
  ) => void
  remove: (productId: string) => void
  clear: () => void
}

const CartContext =
  createContext<CartContextValue | null>(null)

export function CartProvider({
  children,
  products,
}: {
  children: React.ReactNode
  products: Product[]
}) {
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({})

  const cartLoaded = useRef(false)

  const availableQuantity = useCallback(
    (productId: string) => {
      const product = products.find(
        (item) => item.id === productId
      )

      return product?.quantity ?? 0
    },
    [products]
  )

  useEffect(() => {
    const saved = localStorage.getItem(
      'bebehouse-cart'
    )

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<
          string,
          number
        >

        const corrected: Record<string, number> = {}

        for (const [productId, quantity] of Object.entries(
          parsed
        )) {
          const product = products.find(
            (item) => item.id === productId
          )

          if (!product || product.quantity <= 0) {
            continue
          }

          const safeQuantity = Math.min(
            Math.max(Math.floor(quantity), 0),
            product.quantity
          )

          if (safeQuantity > 0) {
            corrected[productId] = safeQuantity
          }
        }

        setQuantities(corrected)
      } catch {
        localStorage.removeItem('bebehouse-cart')
      }
    }

    cartLoaded.current = true
  }, [products])

  useEffect(() => {
    if (!cartLoaded.current) return

    localStorage.setItem(
      'bebehouse-cart',
      JSON.stringify(quantities)
    )
  }, [quantities])

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setQuantities((current) => {
        const next = { ...current }
        const available =
          availableQuantity(productId)

        const clamped = Math.min(
          Math.max(Math.floor(quantity), 0),
          available
        )

        if (clamped === 0) {
          delete next[productId]
        } else {
          next[productId] = clamped
        }

        return next
      })
    },
    [availableQuantity]
  )

  const add = useCallback(
    (productId: string) => {
      setQuantities((current) => {
        const available =
          availableQuantity(productId)

        if (available <= 0) {
          return current
        }

        const currentQuantity =
          current[productId] ?? 0

        if (currentQuantity >= available) {
          return current
        }

        return {
          ...current,
          [productId]: Math.min(
            currentQuantity + 1,
            available
          ),
        }
      })
    },
    [availableQuantity]
  )

  const remove = useCallback(
    (productId: string) =>
      setQuantity(productId, 0),
    [setQuantity]
  )

  const clear = useCallback(
    () => setQuantities({}),
    []
  )

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(
      quantities
    ).flatMap(([id, quantity]) => {
      const product = products.find(
        (item) => item.id === id
      )

      if (!product || product.quantity <= 0) {
        return []
      }

      const safeQuantity = Math.min(
        quantity,
        product.quantity
      )

      return [
        {
          product,
          quantity: safeQuantity,
        },
      ]
    })

    return {
      lines,

      count: lines.reduce(
        (sum, line) => sum + line.quantity,
        0
      ),

      total: lines.reduce(
        (sum, line) =>
          sum +
          line.quantity * line.product.price,
        0
      ),

      quantityOf: (productId) =>
        Math.min(
          quantities[productId] ?? 0,
          availableQuantity(productId)
        ),

      add,
      setQuantity,
      remove,
      clear,
    }
  }, [
    quantities,
    add,
    setQuantity,
    remove,
    clear,
    products,
    availableQuantity,
  ])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error(
      'useCart must be used within CartProvider'
    )
  }

  return context
}
