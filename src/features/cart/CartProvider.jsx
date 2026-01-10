import { get, ref as dbRef, remove, set } from 'firebase/database'
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

// Merge “safe” pour éviter le x2: pour un même produit, on prend la quantité max
// (au lieu de sommer). Ça permet de combiner un panier local/guest avec un panier user
// sans risquer de doubler à chaque ré-hydratation.
function mergeCartItemsMax(a, b) {
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
      qty: Math.max(Number(existing.qty) || 0, qty),
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
    updatedAt: Date.now(),
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
  const prevIsAuthenticatedRef = useRef(null)

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

    // IMPORTANT: éviter de re-fusionner (et donc de doubler) au refresh.
    // On ne fait un merge additif que lors d'une transition guest -> user (login).
    const wasAuthenticated = prevIsAuthenticatedRef.current
    prevIsAuthenticatedRef.current = isAuthenticated

    let cancelled = false

    async function hydrate() {
      setSyncError('')
      hydratingRef.current = true

      try {
        if (isAuthenticated && user?.uid) {
          const snap = await get(dbRef(rtdb, `carts/${user.uid}`))
          const remote = snap.exists() ? itemsMapToArray(snap.val()?.items) : []

          // ATTENTION: au refresh, Firebase Auth peut passer brièvement par "guest" puis redevenir
          // authentifié. Un simple (false -> true) ne doit PAS déclencher un merge additif,
          // sinon on double les quantités.
          // Stratégie:
          // - remote non vide => source de vérité
          //   - si on vient d'un état guest, on combine remote + local avec un merge "max" (sans x2)
          // - remote vide => on migre le local
          const nextItems = remote.length > 0
            ? (wasAuthenticated === false && items.length > 0 ? mergeCartItemsMax(remote, items) : remote)
            : items

          if (!cancelled) setItems(nextItems)

          // Déplacer le guest cart -> user cart si présent
          const guestId = guestCartIdRef.current || getOrCreateGuestCartId()
          guestCartIdRef.current = guestId

          await upsertServerCart({ path: `carts/${user.uid}`, idKey: 'uid', idValue: user.uid, items: nextItems })
          await remove(dbRef(rtdb, `guestCarts/${guestId}`)).catch(() => {})
          return
        }

        // Guest: hydrater uniquement si on a déjà un id (et si le cart local est vide ou quasi)
        const guestId = guestCartIdRef.current || getOrCreateGuestCartId()
        guestCartIdRef.current = guestId

        const snap = await get(dbRef(rtdb, `guestCarts/${guestId}`))
        const remote = snap.exists() ? itemsMapToArray(snap.val()?.items) : []

        // Guest: le local est la source de vérité (même browser). On ne prend le remote
        // que si le local est vide (ex: nouvel onglet / nettoyage localStorage).
        const nextItems = items.length > 0 ? items : remote
        if (!cancelled) setItems(nextItems)

        await upsertServerCart({
          path: `guestCarts/${guestId}`,
          idKey: 'cartId',
          idValue: guestId,
          items: nextItems,
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
