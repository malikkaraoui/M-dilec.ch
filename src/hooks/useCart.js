import { useCartContext } from '../features/cart/cartContext.js'

export function useCart() {
  return useCartContext()
}
