import { ref, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRtdbValue } from '../../hooks/useRtdbValue.js'
import { rtdb } from '../../lib/db.js'
import { Card } from '../../ui/Card.jsx'
import { Badge } from '../../ui/Badge.jsx'
import { Input } from '../../ui/Input.jsx'
import { Button } from '../../ui/Button.jsx'

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

function StatusBadge({ status }) {
  const variants = {
    new: 'brand',
    processing: 'warning',
    done: 'success',
    cancelled: 'error'
  }
  const labels = {
    new: 'Nouvelle',
    processing: 'En traitement',
    done: 'Terminée',
    cancelled: 'Annulée'
  }
  return <Badge variant={variants[status] || 'neutral'}>{labels[status] || status || 'Inconnu'}</Badge>
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
        'Realtime Database non configurée.',
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
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-swiss-neutral-900">Commandes</h1>
          <p className="text-sm text-swiss-neutral-500">Gestion des demandes et suivis.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10"
            />
          </div>

          <select
            className="h-10 rounded-lg border border-swiss-neutral-200 bg-white px-3 text-sm focus:border-medilec-accent focus:ring-1 focus:ring-medilec-accent outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouvelle</option>
            <option value="processing">En traitement</option>
            <option value="done">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>

          <Button variant="secondary" onClick={onResetFilters}>Reset</Button>
        </div>
      </div>

      {status === 'loading' && <div className="py-8 text-center text-swiss-neutral-500">Chargement des commandes...</div>}

      {status === 'error' && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          Erreur de chargement: {error?.message || 'Accès refusé'}
        </div>
      )}

      {status === 'success' && orders.length === 0 && (
        <div className="rounded-lg bg-swiss-neutral-50 p-8 text-center text-swiss-neutral-500 border border-swiss-neutral-100">
          Aucune commande trouvée pour ces critères.
        </div>
      )}

      {status === 'success' && orders.length > 0 && (
        <div className="space-y-6">
          {grouped.map((g) => (
            <Card key={g.key} padding="p-0" className="overflow-hidden">
              <div className="border-b border-swiss-neutral-100 bg-swiss-neutral-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-swiss-neutral-900">{g.email || 'Client Inconnu'}</h3>
                  <div className="flex gap-3 text-xs text-swiss-neutral-500 mt-1">
                    <span>{g.phone || 'Pas de téléphone'}</span>
                    {g.uid && <span className="font-mono opacity-50">UID: {g.uid.slice(0, 8)}...</span>}
                  </div>
                </div>
                <Badge variant="neutral">{g.orders.length} commande(s)</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wider text-swiss-neutral-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Réf</th>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Articles</th>
                      <th className="px-6 py-3 font-semibold">Statut</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-swiss-neutral-100">
                    {g.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-swiss-neutral-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-medium text-swiss-neutral-600">{o.id}</td>
                        <td className="px-6 py-4 text-swiss-neutral-600">{formatDate(o.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-swiss-neutral-900">{o.itemCount || 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={o.status} />
                            <select
                              value={o.status}
                              onChange={(e) => onChangeStatus(o.id, e.target.value)}
                              disabled={updatingId === o.id}
                              className="h-6 w-4 opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer absolute ml-2"
                              title="Changer le statut"
                            >
                              <option value="new">Nouvelle</option>
                              <option value="processing">En traitement</option>
                              <option value="done">Terminée</option>
                              <option value="cancelled">Annulée</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/admin/orders/${o.id}`}
                            className="text-medilec-accent hover:text-red-700 font-medium text-xs transition-colors"
                          >
                            Voir Détails
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
