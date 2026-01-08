import { get, ref } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { rtdb } from '../lib/db.js'

function formatDate(value) {
  if (typeof value !== 'number') return null
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

export function MyOrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const userOrdersPath = user?.uid ? `/userOrders/${user.uid}` : null
  const { status: userOrdersStatus, data: userOrdersData, error: userOrdersError } =
    useRtdbValue(userOrdersPath)

  const orderIds = useMemo(() => {
    if (!userOrdersData || typeof userOrdersData !== 'object') return []
    return Object.keys(userOrdersData).filter((k) => userOrdersData[k] === true)
  }, [userOrdersData])

  const [orders, setOrders] = useState(() => [])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) return
    navigate('/login', { state: { from: location.pathname } })
  }, [authLoading, isAuthenticated, navigate, location.pathname])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setOrdersError('')

      if (!isAuthenticated || !user?.uid) {
        setOrders([])
        return
      }

      if (!rtdb) {
        setOrders([])
        setOrdersError(
          'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
        )
        return
      }

      if (orderIds.length === 0) {
        setOrders([])
        return
      }

      try {
        setLoadingOrders(true)

        const snapshots = await Promise.all(
          orderIds.map((id) => get(ref(rtdb, `orders/${id}`)).catch((err) => ({ __error: err, __id: id }))),
        )

        if (cancelled) return

        const next = []
        for (let i = 0; i < snapshots.length; i += 1) {
          const snap = snapshots[i]
          if (snap && snap.__error) {
            next.push({ id: snap.__id, error: snap.__error })
            continue
          }

          const value = snap.val()
          if (!value) {
            next.push({ id: orderIds[i], missing: true })
            continue
          }

          next.push({
            id: value.id || orderIds[i],
            createdAt: value.createdAt,
            status: value.status,
            itemCount:
              value.items && typeof value.items === 'object' ? Object.keys(value.items).length : null,
            raw: value,
          })
        }

        next.sort((a, b) => {
          const ta = typeof a.createdAt === 'number' ? a.createdAt : 0
          const tb = typeof b.createdAt === 'number' ? b.createdAt : 0
          return tb - ta
        })

        setOrders(next)
      } catch (err) {
        if (cancelled) return
        setOrders([])
        setOrdersError(err?.message || 'Chargement des demandes impossible.')
      } finally {
        if (!cancelled) setLoadingOrders(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.uid, orderIds])

  if (authLoading) {
    return <div className="text-sm text-neutral-600">Chargement…</div>
  }

  if (!isAuthenticated) {
    return null
  }

  const isLoading = userOrdersStatus === 'loading' || loadingOrders

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mes demandes</h1>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/catalog">
          + Nouvelle demande
        </Link>
      </div>

      {userOrdersError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {String(userOrdersError?.message || userOrdersError)}
        </div>
      ) : null}

      {ordersError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {ordersError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Chargement de vos demandes…
        </div>
      ) : orderIds.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucune demande pour le moment.
          <div className="mt-2">
            <Link className="text-blue-600 hover:underline" to="/catalog">
              Aller au catalogue
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Référence: <span className="font-mono">{o.id}</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {formatDate(o.createdAt) || 'Date inconnue'} · Statut: {formatStatus(o.status)}
                    {typeof o.itemCount === 'number' ? ` · Articles: ${o.itemCount}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link className="text-sm text-blue-600 hover:underline" to={`/my-orders/${o.id}`}>
                    Voir le détail
                  </Link>
                  <Link className="text-sm text-neutral-700 hover:text-neutral-900" to={`/profile`}>
                    Profil
                  </Link>
                </div>
              </div>

              {o.missing ? (
                <div className="mt-3 text-xs text-neutral-500">
                  Cette demande n’est plus disponible (ou vous n’y avez plus accès).
                </div>
              ) : null}

              {o.error ? (
                <div className="mt-3 text-xs text-red-700">
                  Chargement impossible pour cette demande.
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
