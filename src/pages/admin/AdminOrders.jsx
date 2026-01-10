import { ref, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRtdbValue } from '../../hooks/useRtdbValue.js'
import { rtdb } from '../../lib/db.js'

function formatDate(value) {
  if (typeof value !== 'number') return '—'
  try {
    return new Intl.DateTimeFormat('fr-CH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return new Date(value).toLocaleString()
  }
}

function formatStatus(status) {
  switch (status) {
    case 'new':
      return 'Nouvelle'
    case 'processing':
      return 'En traitement'
    case 'done':
      return 'Terminée'
    case 'cancelled':
      return 'Annulée'
    default:
      return status || '—'
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function sumItemsQty(items) {
  const raw = items && typeof items === 'object' ? items : null
  if (!raw) return null

  const values = Array.isArray(raw) ? raw : Object.values(raw)

  let sum = 0
  let any = false
  for (const it of values) {
    if (!it || typeof it !== 'object') continue
    const qty = Number(it.qty)
    if (!Number.isFinite(qty)) continue
    sum += qty
    any = true
  }

  return any ? sum : null
}

const LS_QUERY_KEY = 'medilec_admin_orders_query_v1'
const LS_STATUS_KEY = 'medilec_admin_orders_status_v1'

function isValidStatusFilter(value) {
  return value === 'all' || value === 'new' || value === 'processing' || value === 'done' || value === 'cancelled'
}

export function AdminOrdersPage() {
  const { status, data, error } = useRtdbValue('/orders')

  const [query, setQuery] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(LS_QUERY_KEY) || ''
  })
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === 'undefined') return 'all'
    const value = window.localStorage.getItem(LS_STATUS_KEY) || 'all'
    return isValidStatusFilter(value) ? value : 'all'
  })
  const [updatingId, setUpdatingId] = useState('')
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LS_QUERY_KEY, query)
  }, [query])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LS_STATUS_KEY, statusFilter)
  }, [statusFilter])

  const orders = useMemo(() => {
    const raw = data
    if (!raw || typeof raw !== 'object') return []

    const list = Object.entries(raw)
      .map(([id, o]) => {
        const createdAt = typeof o?.createdAt === 'number' ? o.createdAt : null
        const uid = typeof o?.user?.uid === 'string' ? o.user.uid : ''
        const email = typeof o?.user?.email === 'string' ? o.user.email : ''
        const phone = typeof o?.user?.phone === 'string' ? o.user.phone : ''

        const itemCount = sumItemsQty(o?.items)

        return {
          id,
          createdAt,
          status: typeof o?.status === 'string' ? o.status : '',
          uid,
          email,
          phone,
          itemCount,
          note: typeof o?.note === 'string' ? o.note : '',
        }
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    const withStatus = statusFilter === 'all' ? list : list.filter((o) => o.status === statusFilter)

    const q = normalizeText(query)
    if (!q) return withStatus.slice(0, 50)

    const filtered = withStatus.filter((o) => {
      const haystack = normalizeText(
        `${o.id} ${o.status} ${o.uid} ${o.email} ${o.phone} ${o.note} ${o.itemCount ?? ''}`,
      )
      return haystack.includes(q)
    })

    return filtered.slice(0, 50)
  }, [data, query, statusFilter])

  const grouped = useMemo(() => {
    const groupsByKey = new Map()

    for (const o of orders) {
      const key = o.uid || o.email || o.phone || o.id
      const existing = groupsByKey.get(key)
      if (existing) {
        existing.orders.push(o)
        if (!existing.latestCreatedAt || (o.createdAt || 0) > existing.latestCreatedAt) {
          existing.latestCreatedAt = o.createdAt || 0
        }
        continue
      }

      groupsByKey.set(key, {
        key,
        uid: o.uid,
        email: o.email,
        phone: o.phone,
        latestCreatedAt: o.createdAt || 0,
        orders: [o],
      })
    }

    const groups = Array.from(groupsByKey.values())

    for (const g of groups) {
      g.orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }

    groups.sort((a, b) => (b.latestCreatedAt || 0) - (a.latestCreatedAt || 0))

    return groups
  }, [orders])

  function onResetFilters() {
    setQuery('')
    setStatusFilter('all')
  }

  async function onChangeStatus(orderId, nextStatus) {
    setUpdateError('')

    if (!orderId) return

    if (!rtdb) {
      setUpdateError(
        'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
      )
      return
    }

    try {
      setUpdatingId(orderId)
      await update(ref(rtdb, `orders/${orderId}`), {
        status: nextStatus,
      })
    } catch (err) {
      setUpdateError(err?.message || 'Mise à jour impossible.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Commandes (demandes)</h1>
          <p className="mt-1 text-sm text-neutral-600">MVP: liste simple + changement de statut.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-3">
          <div className="w-full sm:w-80">
            <label className="sr-only" htmlFor="admin-orders-search">
              Rechercher
            </label>
            <input
              id="admin-orders-search"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              placeholder="Recherche (réf, email, statut…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-neutral-600" htmlFor="admin-orders-status-filter">
              Statut
            </label>
            <select
              id="admin-orders-status-filter"
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="new">Nouvelle</option>
              <option value="processing">En traitement</option>
              <option value="done">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          <button
            type="button"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 hover:bg-neutral-50 sm:w-auto"
            onClick={onResetFilters}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Chargement…
        </div>
      ) : null}

      {status === 'error' || error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Lecture des commandes impossible (droits admin requis).
        </div>
      ) : null}

      {updateError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {updateError}
        </div>
      ) : null}

      {status === 'success' && orders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucune commande trouvée.
        </div>
      ) : null}

      {status === 'success' && orders.length > 0 ? (
        <div className="space-y-3">
          {grouped.map((g) => (
            <div key={g.key} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-neutral-900">
                    {g.email || 'Client (email inconnu)'}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {g.phone ? <span>{g.phone}</span> : <span>—</span>}
                    {g.uid ? (
                      <span className="ml-2 font-mono text-[11px] text-neutral-500">UID: {g.uid}</span>
                    ) : null}
                  </div>
                </div>

                <div className="text-xs text-neutral-500">{g.orders.length} commande(s)</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Référence</th>
                      <th className="px-4 py-3">Créée le</th>
                      <th className="px-4 py-3">Articles</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {g.orders.map((o) => (
                      <tr key={o.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-neutral-900">{o.id}</div>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {typeof o.itemCount === 'number' ? o.itemCount : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-neutral-500">{formatStatus(o.status)}</div>
                          <select
                            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm"
                            value={o.status || 'new'}
                            disabled={updatingId === o.id}
                            onChange={(e) => onChangeStatus(o.id, e.target.value)}
                          >
                            <option value="new">new</option>
                            <option value="processing">processing</option>
                            <option value="done">done</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                          {updatingId === o.id ? (
                            <div className="mt-1 text-xs text-neutral-500">Mise à jour…</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Link className="text-sm text-blue-600 hover:underline" to={`/admin/orders/${o.id}`}>
                            Détail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-neutral-500">
        Affichage limité à 50 résultats (tri par date décroissante).
      </p>
    </section>
  )
}
