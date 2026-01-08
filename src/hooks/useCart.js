import { useEffect, useMemo, useState } from 'react'

import {
  addToCart,
  CART_STORAGE_KEY,
  clearCart as clearCartStorage,
  countCartItems,
  readCart,
  removeFromCart,
  setCartQty,
  writeCart,
} from '../lib/cart.js'

export function useCart() {
  const [items, setItems] = useState(() => readCart())

  useEffect(() => {
    // Synchronise entre onglets
    function onStorage(e) {
      if (e?.key !== CART_STORAGE_KEY) return
      setItems(readCart())
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    writeCart(items)
  }, [items])

  const count = useMemo(() => countCartItems(items), [items])

  return useMemo(
    () => ({
      items,
      count,
      add(product) {
        setItems((prev) => addToCart(prev, product))
      },
      remove(id) {
        setItems((prev) => removeFromCart(prev, id))
      },
      setQty(id, qty) {
        setItems((prev) => setCartQty(prev, id, qty))
      },
      clear() {
        clearCartStorage()
        setItems([])
      },
    }),
    [items, count],
  )
}
