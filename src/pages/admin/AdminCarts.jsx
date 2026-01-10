import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRtdbValue } from '../../hooks/useRtdbValue.js'

function countItems(items) {
  if (!items || typeof items !== 'object') return 0
  return Object.values(items).reduce((sum, it) => sum + (Number(it?.qty) || 0), 0)
}

function sumTotalCents(items) {
  if (!items || typeof items !== 'object') return null
  let sum = 0
  let anyPriced = false
  for (const it of Object.values(items)) {
    if (!it || typeof it !== 'object') continue
    const qty = Number(it.qty) || 0
    const priceCents = typeof it.priceCents === 'number' ? it.priceCents : null
    if (qty <= 0 || typeof priceCents !== 'number') continue
    sum += Math.max(0, Math.trunc(qty)) * priceCents
    anyPriced = true
  }
  return anyPriced ? sum : null
}

function formatChfFromCents(cents) {
  const n = Number(cents)
  if (!Number.isFinite(n)) return '—'
  const chf = n / 100
  try {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(chf)
  } catch {
    return `${chf.toFixed(2)} CHF`
  }
}

function formatDate(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return '—'
  try {
    return new Date(n).toLocaleString('fr-CH')
  } catch {
    return String(n)
  }
}

export function AdminCartsPage() {
  const [tab, setTab] = useState('users')

  const { status: cartsStatus, data: cartsData, error: cartsError } = useRtdbValue('/carts')
  const { status: guestStatus, data: guestData, error: guestError } = useRtdbValue('/guestCarts')

  const userCarts = useMemo(() => {
    const raw = cartsData && typeof cartsData === 'object' ? cartsData : null
    if (!raw) return []

    return Object.entries(raw)
      .map(([uid, cart]) => ({
        id: uid,
        updatedAt: cart?.updatedAt,
        items: cart?.items,
      }))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
  }, [cartsData])

  const guestCarts = useMemo(() => {
    const raw = guestData && typeof guestData === 'object' ? guestData : null
    if (!raw) return []

    return Object.entries(raw)
      .map(([cartId, cart]) => ({
        id: cartId,
        updatedAt: cart?.updatedAt,
        items: cart?.items,
      }))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
  }, [guestData])

  const list = tab === 'users' ? userCarts : guestCarts
  const status = tab === 'users' ? cartsStatus : guestStatus
  const error = tab === 'users' ? cartsError : guestError

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paniers</h1>
          <p className="mt-1 text-sm text-neutral-600">Vue admin des paniers persistés dans RTDB.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={
              tab === 'users'
                ? 'rounded-lg px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50'
            }
            style={tab === 'users' ? { backgroundColor: 'var(--medilec-accent)' } : undefined}
            type="button"
            onClick={() => setTab('users')}
          >
            Utilisateurs
          </button>
          <button
            className={
              tab === 'guests'
                ? 'rounded-lg px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50'
            }
            style={tab === 'guests' ? { backgroundColor: 'var(--medilec-accent)' } : undefined}
            type="button"
            onClick={() => setTab('guests')}
          >
            Invités
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Chargement…</div>
      ) : null}

      {status === 'error' || error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Lecture impossible. Vérifie les règles RTDB (admin requis).
        </div>
      ) : null}

      {status === 'success' && list.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucun panier pour le moment.
        </div>
      ) : null}

      {status === 'success' && list.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">{tab === 'users' ? 'UID' : 'Cart ID'}</th>
                  <th className="px-4 py-3">Articles</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Dernière mise à jour</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-neutral-900">{c.id}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{countItems(c.items)}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {(() => {
                        const total = sumTotalCents(c.items)
                        return typeof total === 'number' ? formatChfFromCents(total) : '—'
                      })()}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{formatDate(c.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link className="text-sm text-blue-700 hover:underline" to={`/admin/carts/${tab}/${c.id}`}>
                        Détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-neutral-500">
        Notes: les paniers utilisateurs sont sous <code className="font-mono">/carts/&lt;uid&gt;</code>, les paniers invités sous{' '}
        <code className="font-mono">/guestCarts/&lt;cartId&gt;</code>.
      </p>
    </section>
  )
}
