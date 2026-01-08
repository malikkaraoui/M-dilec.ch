import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'

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

export function MyOrderDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const orderId = typeof params.id === 'string' ? params.id : ''
  const { isAuthenticated, loading: authLoading } = useAuth()

  const { status, data, error } = useRtdbValue(orderId ? `/orders/${orderId}` : null)

  const items = useMemo(() => {
    const raw = data?.items
    if (!raw || typeof raw !== 'object') return []

    return Object.keys(raw)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => raw[k])
      .filter(Boolean)
  }, [data])

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) return
    navigate('/login', { state: { from: location.pathname } })
  }, [authLoading, isAuthenticated, navigate, location.pathname])

  if (authLoading) {
    return <div className="text-sm text-neutral-600">Chargement…</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Détail de la demande</h1>
          <div className="mt-1 text-xs text-neutral-500">
            Référence: <span className="font-mono">{orderId || '—'}</span>
          </div>
        </div>

        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/my-orders">
          ← Retour
        </Link>
      </div>

      {status === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Chargement…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Accès refusé ou demande introuvable.
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Cette demande n’existe pas (ou a été supprimée).
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr,360px]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Articles</div>
              {items.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">Aucun article.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((it, idx) => (
                    <li key={`${it?.id || 'item'}-${idx}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-900">{it?.name || it?.id || 'Article'}</div>
                          {it?.brand ? <div className="mt-1 text-xs text-neutral-500">{it.brand}</div> : null}
                        </div>
                        <div className="text-sm text-neutral-700">× {it?.qty || 1}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {data?.note ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">Note</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{data.note}</div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <div>
                <div className="text-xs text-neutral-500">Statut</div>
                <div className="text-sm font-semibold text-neutral-900">{formatStatus(data?.status)}</div>
              </div>

              <div>
                <div className="text-xs text-neutral-500">Créée le</div>
                <div className="text-sm text-neutral-900">{formatDate(data?.createdAt) || '—'}</div>
              </div>

              <div>
                <div className="text-xs text-neutral-500">Contact</div>
                <div className="text-sm text-neutral-900">
                  {data?.user?.email ? <div>{data.user.email}</div> : null}
                  {data?.user?.phone ? <div>{data.user.phone}</div> : null}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-neutral-500">
              MVP: pas de paiement. Nous vous recontactons pour confirmer disponibilité/prix.
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
