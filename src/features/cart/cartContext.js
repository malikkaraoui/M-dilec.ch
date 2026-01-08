import { createContext, useContext } from 'react'

export const CartContext = createContext(null)

export function useCartContext() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart doit être utilisé dans un <CartProvider>.')
  }
  return ctx
}
