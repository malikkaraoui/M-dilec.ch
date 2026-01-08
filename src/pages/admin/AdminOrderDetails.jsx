import { ref, serverTimestamp, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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

export function AdminOrderDetailsPage() {
  const params = useParams()
  const orderId = typeof params.id === 'string' ? params.id : ''

  const { status, data, error } = useRtdbValue(orderId ? `/orders/${orderId}` : null)

  const items = useMemo(() => {
    const raw = data?.items
    if (!raw || typeof raw !== 'object') return []

    return Object.keys(raw)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => raw[k])
      .filter(Boolean)
  }, [data])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [statusValue, setStatusValue] = useState('new')

  // sync soft quand la data arrive
  useEffect(() => {
    if (!data) return
    setAdminNote(typeof data.adminNote === 'string' ? data.adminNote : '')
    setStatusValue(typeof data.status === 'string' ? data.status : 'new')
  }, [data])

  async function onSave() {
    setSaveError('')

    if (!orderId) return

    if (!rtdb) {
      setSaveError('Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.')
      return
    }

    const nextAdminNote = String(adminNote || '').trim()

    try {
      setSaving(true)
      await update(ref(rtdb, `orders/${orderId}`), {
        status: statusValue,
        adminNote: nextAdminNote || null,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      setSaveError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Commande (détail)</h1>
          <div className="mt-1 text-xs text-neutral-500">
            Référence: <span className="font-mono">{orderId || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/admin/orders">
            ← Retour
          </Link>
          <Link className="text-sm text-blue-600 hover:underline" to={`/my-orders/${orderId}`}>
            Voir côté client
          </Link>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Chargement…</div>
      ) : null}

      {status === 'error' || error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Accès refusé ou commande introuvable.
        </div>
      ) : null}

      {status === 'success' && !data ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Introuvable.</div>
      ) : null}

      {status === 'success' && data ? (
        <div className="grid gap-4 lg:grid-cols-[1fr,420px]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Client</div>
              <div className="mt-2 text-sm text-neutral-800">
                <div>{data?.user?.email || '—'}</div>
                <div className="text-neutral-600">{data?.user?.phone || '—'}</div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">UID: {data?.user?.uid || '—'}</div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Articles</div>
              {items.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">Aucun article.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((it, idx) => (
                    <li
                      key={`${it?.id || 'item'}-${idx}`}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                    >
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
                <div className="text-sm font-semibold text-neutral-900">Note client</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{data.note}</div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <div>
                <div className="text-xs text-neutral-500">Créée le</div>
                <div className="text-sm text-neutral-900">{formatDate(data?.createdAt)}</div>
              </div>

              <div>
                <div className="text-xs text-neutral-500">Statut</div>
                <div className="text-sm font-semibold text-neutral-900">{formatStatus(data?.status)}</div>
                <select
                  className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm"
                  value={statusValue}
                  disabled={saving}
                  onChange={(e) => setStatusValue(e.target.value)}
                >
                  <option value="new">new</option>
                  <option value="processing">processing</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="text-sm font-semibold text-neutral-900" htmlFor="admin-note">
                  Note admin
                </label>
                <textarea
                  id="admin-note"
                  className="mt-2 min-h-32 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                  style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ex: appeler le client / vérifier compatibilité / stock…"
                />
                <div className="mt-1 text-xs text-neutral-500">Visible uniquement côté admin.</div>
              </div>

              {saveError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}

              <button
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--medilec-accent)' }}
                disabled={saving}
                onClick={onSave}
                type="button"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
