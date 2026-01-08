import { ref, update } from 'firebase/database'
import { useMemo, useState } from 'react'
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

export function AdminOrdersPage() {
  const { status, data, error } = useRtdbValue('/orders')

  const [query, setQuery] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [updateError, setUpdateError] = useState('')

  const orders = useMemo(() => {
    const raw = data
    if (!raw || typeof raw !== 'object') return []

    const list = Object.entries(raw)
      .map(([id, o]) => {
        const createdAt = typeof o?.createdAt === 'number' ? o.createdAt : null
        const email = typeof o?.user?.email === 'string' ? o.user.email : ''
        const phone = typeof o?.user?.phone === 'string' ? o.user.phone : ''

        const itemCount = o?.items && typeof o.items === 'object' ? Object.keys(o.items).length : null

        return {
          id,
          createdAt,
          status: typeof o?.status === 'string' ? o.status : '',
          email,
          phone,
          itemCount,
          note: typeof o?.note === 'string' ? o.note : '',
        }
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    const q = normalizeText(query)
    if (!q) return list.slice(0, 50)

    const filtered = list.filter((o) => {
      const haystack = normalizeText(
        `${o.id} ${o.status} ${o.email} ${o.phone} ${o.note} ${o.itemCount ?? ''}`,
      )
      return haystack.includes(q)
    })

    return filtered.slice(0, 50)
  }, [data, query])

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
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Créée le</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Articles</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.map((o) => (
                  <tr key={o.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-neutral-900">{o.id}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-900">{o.email || '—'}</div>
                      <div className="text-xs text-neutral-500">{o.phone || '—'}</div>
                    </td>
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
                      <div className="flex flex-wrap gap-2">
                        <Link className="text-sm text-blue-600 hover:underline" to={`/my-orders/${o.id}`}>
                          Voir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-neutral-500">
        Affichage limité à 50 résultats (tri par date décroissante).
      </p>
    </section>
  )
}
