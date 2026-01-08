import { get, ref as dbRef, remove, serverTimestamp, set } from 'firebase/database'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addToCart,
  clearCart as clearCartStorage,
  countCartItems,
  readCart,
  removeFromCart,
  setCartQty,
  writeCart,
} from '../../lib/cart.js'
import { useAuth } from '../../hooks/useAuth.js'
import { rtdb } from '../../lib/db.js'
import { CartContext } from './cartContext.js'

function getOrCreateGuestCartId() {
  if (typeof window === 'undefined') return ''

  const KEY = 'medilec_guest_cart_id_v1'
  const existing = window.localStorage.getItem(KEY)
  if (existing && String(existing).trim()) return existing

  let next = ''
  try {
    next = window.crypto?.randomUUID?.() || ''
  } catch {
    // ignore
  }

  if (!next) {
    next = `guest_${Math.random().toString(16).slice(2)}_${Date.now()}`
  }

  window.localStorage.setItem(KEY, next)
  return next
}

function itemsArrayToMap(items) {
  const out = {}
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it !== 'object') continue
    const id = String(it.id || '').trim()
    const qty = Number(it.qty)
    if (!id) continue
    if (!Number.isFinite(qty) || qty <= 0) continue

    out[id] = {
      id,
      qty,
      name: typeof it.name === 'string' ? it.name : null,
      brand: typeof it.brand === 'string' ? it.brand : null,
      priceCents: typeof it.priceCents === 'number' ? it.priceCents : null,
    }
  }
  return out
}

function itemsMapToArray(itemsMap) {
  const raw = itemsMap && typeof itemsMap === 'object' ? itemsMap : null
  if (!raw) return []

  return Object.entries(raw)
    .map(([id, it]) => {
      if (!it || typeof it !== 'object') return null
      const qty = Number(it.qty)
      if (!id) return null
      if (!Number.isFinite(qty) || qty <= 0) return null
      return {
        id,
        qty,
        name: typeof it.name === 'string' ? it.name : undefined,
        brand: typeof it.brand === 'string' ? it.brand : undefined,
        priceCents: typeof it.priceCents === 'number' ? it.priceCents : it.priceCents === null ? null : undefined,
      }
    })
    .filter(Boolean)
}

function mergeCartItems(a, b) {
  const map = new Map()

  for (const it of Array.isArray(a) ? a : []) {
    if (!it || typeof it !== 'object') continue
    const id = String(it.id || '').trim()
    const qty = Number(it.qty)
    if (!id || !Number.isFinite(qty) || qty <= 0) continue
    map.set(id, { ...it, id, qty })
  }

  for (const it of Array.isArray(b) ? b : []) {
    if (!it || typeof it !== 'object') continue
    const id = String(it.id || '').trim()
    const qty = Number(it.qty)
    if (!id || !Number.isFinite(qty) || qty <= 0) continue

    const existing = map.get(id)
    if (!existing) {
      map.set(id, { ...it, id, qty })
      continue
    }

    map.set(id, {
      ...existing,
      qty: (Number(existing.qty) || 0) + qty,
      // garde les méta les plus “riches”
      name: existing.name || it.name,
      brand: existing.brand || it.brand,
      priceCents: typeof existing.priceCents === 'number' ? existing.priceCents : it.priceCents,
    })
  }

  return Array.from(map.values())
}

async function upsertServerCart({ path, idKey, idValue, items }) {
  if (!rtdb) return

  const payload = {
    [idKey]: idValue,
    updatedAt: serverTimestamp(),
    items: itemsArrayToMap(items),
  }

  await set(dbRef(rtdb, path), payload)
}

export function CartProvider({ children }) {
  const { user, isAuthenticated, isAuthConfigured } = useAuth()

  const [items, setItems] = useState(() => readCart())
  const [syncError, setSyncError] = useState('')

  const guestCartIdRef = useRef('')
  const hydratingRef = useRef(false)
  const writeTimerRef = useRef(null)

  useEffect(() => {
    writeCart(items)
  }, [items])

  useEffect(() => {
    function onStorage(e) {
      if (e?.key !== 'medilec_cart_v1') return
      setItems(readCart())
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 1) Hydratation depuis RTDB (cart user ou guest)
  useEffect(() => {
    if (!rtdb) return undefined
    if (!isAuthConfigured) return undefined

    let cancelled = false

    async function hydrate() {
      setSyncError('')
      hydratingRef.current = true

      try {
        if (isAuthenticated && user?.uid) {
          const snap = await get(dbRef(rtdb, `carts/${user.uid}`))
          const remote = snap.exists() ? itemsMapToArray(snap.val()?.items) : []
          const merged = mergeCartItems(remote, items)
          if (!cancelled) setItems(merged)

          // Déplacer le guest cart -> user cart si présent
          const guestId = guestCartIdRef.current || getOrCreateGuestCartId()
          guestCartIdRef.current = guestId
          await upsertServerCart({ path: `carts/${user.uid}`, idKey: 'uid', idValue: user.uid, items: merged })
          await remove(dbRef(rtdb, `guestCarts/${guestId}`)).catch(() => {})
          return
        }

        // Guest: hydrater uniquement si on a déjà un id (et si le cart local est vide ou quasi)
        const guestId = guestCartIdRef.current || getOrCreateGuestCartId()
        guestCartIdRef.current = guestId

        const snap = await get(dbRef(rtdb, `guestCarts/${guestId}`))
        const remote = snap.exists() ? itemsMapToArray(snap.val()?.items) : []
        const merged = mergeCartItems(remote, items)
        if (!cancelled) setItems(merged)

        await upsertServerCart({
          path: `guestCarts/${guestId}`,
          idKey: 'cartId',
          idValue: guestId,
          items: merged,
        })
      } catch (err) {
        if (!cancelled) setSyncError(err?.message || 'Synchronisation panier impossible.')
      } finally {
        hydratingRef.current = false
      }
    }

    hydrate()

    return () => {
      cancelled = true
      hydratingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthConfigured, isAuthenticated, user?.uid, Boolean(rtdb)])

  // 2) Persist debounced vers RTDB
  useEffect(() => {
    if (!rtdb) return undefined
    if (!isAuthConfigured) return undefined
    if (hydratingRef.current) return undefined

    const path = isAuthenticated && user?.uid
      ? `carts/${user.uid}`
      : `guestCarts/${guestCartIdRef.current || getOrCreateGuestCartId()}`

    const idKey = isAuthenticated && user?.uid ? 'uid' : 'cartId'
    const idValue = isAuthenticated && user?.uid ? user.uid : (guestCartIdRef.current || getOrCreateGuestCartId())

    // debounce
    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current)
      writeTimerRef.current = null
    }

    writeTimerRef.current = window.setTimeout(() => {
      upsertServerCart({ path, idKey, idValue, items }).catch(() => {
        // fail-soft
      })
    }, 600)

    return () => {
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current)
        writeTimerRef.current = null
      }
    }
  }, [items, isAuthConfigured, isAuthenticated, user?.uid])

  const count = useMemo(() => countCartItems(items), [items])

  const value = useMemo(
    () => ({
      items,
      count,
      syncError,
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
    [items, count, syncError],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
