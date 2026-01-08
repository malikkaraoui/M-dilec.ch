const STORAGE_KEY = 'medilec_cart_v1'

/**
 * @typedef {{
 *  id: string,
 *  qty: number,
 *  name?: string,
 *  brand?: string,
 *  priceCents?: number | null,
 * }} CartItem
 */

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function readCart() {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  const parsed = safeJsonParse(raw)
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((x) => {
      if (!x || typeof x !== 'object') return null
      const id = String(x.id || '').trim()
      const qty = Number(x.qty)
      if (!id) return null
      if (!Number.isFinite(qty) || qty <= 0) return null
      return {
        id,
        qty,
        name: typeof x.name === 'string' ? x.name : undefined,
        brand: typeof x.brand === 'string' ? x.brand : undefined,
        priceCents: typeof x.priceCents === 'number' ? x.priceCents : x.priceCents === null ? null : undefined,
      }
    })
    .filter(Boolean)
}

export function writeCart(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function countCartItems(items) {
  return (items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
}

export function addToCart(items, payload) {
  const id = String(payload?.id || '').trim()
  if (!id) return items

  const nextItems = Array.isArray(items) ? [...items] : []
  const idx = nextItems.findIndex((x) => x.id === id)

  if (idx >= 0) {
    nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 }
    return nextItems
  }

  nextItems.push({
    id,
    qty: 1,
    name: payload?.name,
    brand: payload?.brand,
    priceCents: payload?.priceCents ?? undefined,
  })

  return nextItems
}

export function removeFromCart(items, id) {
  const key = String(id || '').trim()
  if (!key) return items
  return (items || []).filter((x) => x.id !== key)
}

export function setCartQty(items, id, qty) {
  const key = String(id || '').trim()
  const q = Number(qty)
  if (!key) return items

  if (!Number.isFinite(q) || q <= 0) {
    return removeFromCart(items, key)
  }

  return (items || []).map((x) => (x.id === key ? { ...x, qty: q } : x))
}

export function clearCart() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export { STORAGE_KEY as CART_STORAGE_KEY }
