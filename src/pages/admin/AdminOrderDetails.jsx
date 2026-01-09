import { ref, serverTimestamp, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

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

function normalizeItems(items) {
  const raw = items && typeof items === 'object' ? items : null
  if (!raw) return []

  if (Array.isArray(raw)) {
    return raw
      .map((it, idx) => {
        if (!it || typeof it !== 'object') return null
        const id = typeof it.id === 'string' && it.id.trim() ? it.id : String(idx)
        return { ...it, id }
      })
      .filter(Boolean)
  }

  const entries = Object.entries(raw).filter(([, it]) => it && typeof it === 'object')
  const allNumericKeys = entries.length > 0 && entries.every(([k]) => /^\d+$/.test(k))

  entries.sort((a, b) => {
    if (allNumericKeys) return Number(a[0]) - Number(b[0])

    const aIt = a[1]
    const bIt = b[1]
    const aKey = String(aIt?.name || aIt?.id || a[0] || '').toLowerCase()
    const bKey = String(bIt?.name || bIt?.id || b[0] || '').toLowerCase()
    return aKey.localeCompare(bKey, 'fr')
  })

  return entries
    .map(([k, it]) => {
      const id = typeof it.id === 'string' && it.id.trim() ? it.id : String(k)
      return { ...it, id }
    })
    .filter(Boolean)
}

function sanitizeItem(it) {
  if (!it || typeof it !== 'object') return null

  const id = String(it.id || '').trim()
  const qty = Number(it.qty)
  if (!id) return null
  if (!Number.isFinite(qty)) return null

  return {
    id,
    qty: Math.max(1, Math.min(999, Math.trunc(qty))),
    name: typeof it.name === 'string' ? it.name : null,
    brand: typeof it.brand === 'string' ? it.brand : null,
    priceCents: typeof it.priceCents === 'number' ? it.priceCents : it.priceCents === null ? null : null,
  }
}

function itemsArrayToIndexedObject(items) {
  const out = {}
  const list = Array.isArray(items) ? items : []
  let idx = 0
  for (const it of list) {
    const clean = sanitizeItem(it)
    if (!clean) continue
    out[idx] = clean
    idx += 1
  }
  return out
}

const LS_ADMIN_PRODUCTS_SELECTED_KEY = 'medilec_admin_products_selected_v1'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    return true
  } catch {
    return false
  }
}

export function AdminOrderDetailsPage() {
  const params = useParams()
  const orderId = typeof params.id === 'string' ? params.id : ''
  const navigate = useNavigate()

  const { status, data, error } = useRtdbValue(orderId ? `/orders/${orderId}` : null)

  const items = useMemo(() => {
    return normalizeItems(data?.items)
  }, [data])

  const [editItems, setEditItems] = useState(() => [])
  const [addItemId, setAddItemId] = useState('')
  const [addItemQty, setAddItemQty] = useState('1')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [statusValue, setStatusValue] = useState('new')

  // sync soft quand la data arrive
  useEffect(() => {
    if (!data) return
    setAdminNote(typeof data.adminNote === 'string' ? data.adminNote : '')
    setStatusValue(typeof data.status === 'string' ? data.status : 'new')
    setEditItems(normalizeItems(data.items))
  }, [data])

  async function onSave() {
    setSaveError('')

    if (!orderId) return

    if (!rtdb) {
      setSaveError('Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.')
      return
    }

    const nextAdminNote = String(adminNote || '').trim()

    // items: on sauvegarde une version “figée” (indexée 0..n-1)
    const nextItems = itemsArrayToIndexedObject(editItems)
    if (Object.keys(nextItems).length === 0) {
      setSaveError('La commande doit contenir au moins 1 article.')
      return
    }

    try {
      setSaving(true)
      await update(ref(rtdb, `orders/${orderId}`), {
        status: statusValue,
        adminNote: nextAdminNote || null,
        items: nextItems,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      setSaveError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  function onChangeQty(itemId, nextQty) {
    setEditItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((it) => {
        if (!it || typeof it !== 'object') return it
        if (it.id !== itemId) return it
        const qty = Number(nextQty)
        if (!Number.isFinite(qty)) return { ...it, qty: 1 }
        return { ...it, qty: Math.max(1, Math.min(999, Math.trunc(qty))) }
      }),
    )
  }

  function onRemoveItem(itemId) {
    setEditItems((prev) => (Array.isArray(prev) ? prev : []).filter((it) => it?.id !== itemId))
  }

  function onAddItem() {
    const id = String(addItemId || '').trim()
    const qty = Number(addItemQty)
    if (!id) {
      setSaveError('ID produit requis pour ajouter un article.')
      return
    }
    if (!Number.isFinite(qty) || qty < 1) {
      setSaveError('Quantité invalide.')
      return
    }

    setSaveError('')

    setEditItems((prev) => {
      const list = Array.isArray(prev) ? [...prev] : []
      const existing = list.find((x) => x?.id === id)
      if (existing) {
        return list.map((x) => (x?.id === id ? { ...x, qty: Math.min(999, (Number(x.qty) || 0) + Math.trunc(qty)) } : x))
      }

      // best-effort: on récupère les infos visibles dans la commande actuelle (ou fallback)
      const fromCurrent = items.find((x) => x?.id === id)
      list.push({
        id,
        qty: Math.max(1, Math.min(999, Math.trunc(qty))),
        name: fromCurrent?.name || null,
        brand: fromCurrent?.brand || null,
        priceCents: typeof fromCurrent?.priceCents === 'number' ? fromCurrent.priceCents : null,
      })

      return list
    })

    setAddItemId('')
    setAddItemQty('1')
  }

  async function onCopy(value) {
    if (typeof window === 'undefined') return
    if (!value) return
    const ok = await copyToClipboard(value)
    if (!ok) {
      // fail-soft
      window.prompt('Copiez:', String(value))
    }
  }

  function onOpenProduct(productId) {
    if (typeof window === 'undefined') return
    const id = String(productId || '').trim()
    if (!id) return
    window.localStorage.setItem(LS_ADMIN_PRODUCTS_SELECTED_KEY, id)
    navigate('/admin/products')
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

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                  onClick={() => onCopy(data?.user?.email)}
                  disabled={!data?.user?.email}
                >
                  Copier email
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                  onClick={() => onCopy(data?.user?.phone)}
                  disabled={!data?.user?.phone}
                >
                  Copier tél.
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                  onClick={() => onCopy(data?.user?.uid)}
                  disabled={!data?.user?.uid}
                >
                  Copier UID
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Articles</div>
              {editItems.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">Aucun article.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {editItems.map((it, idx) => (
                    <li
                      key={`${it?.id || 'item'}-${idx}`}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-900">{it?.name || it?.id || 'Article'}</div>
                          {it?.brand ? <div className="mt-1 text-xs text-neutral-500">{it.brand}</div> : null}
                          {it?.id ? (
                            <button
                              type="button"
                              className="mt-2 text-xs text-blue-700 hover:underline"
                              onClick={() => onOpenProduct(it.id)}
                            >
                              Ouvrir produit (admin)
                            </button>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="sr-only" htmlFor={`admin-order-qty-${it?.id || idx}`}>Quantité</label>
                          <input
                            id={`admin-order-qty-${it?.id || idx}`}
                            className="w-20 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
                            min={1}
                            max={999}
                            value={Number(it?.qty) || 1}
                            onChange={(e) => onChangeQty(it?.id, e.target.value)}
                            type="number"
                            inputMode="numeric"
                          />
                          <button
                            type="button"
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                            onClick={() => onRemoveItem(it?.id)}
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
                <div className="text-xs font-semibold text-neutral-700">Ajouter un article</div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs text-neutral-600" htmlFor="admin-add-item-id">ID produit</label>
                    <input
                      id="admin-add-item-id"
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      placeholder="ex: -OiVW… (id RTDB produit)"
                      value={addItemId}
                      onChange={(e) => setAddItemId(e.target.value)}
                      type="text"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-xs text-neutral-600" htmlFor="admin-add-item-qty">Qté</label>
                    <input
                      id="admin-add-item-qty"
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      min={1}
                      max={999}
                      value={addItemQty}
                      onChange={(e) => setAddItemQty(e.target.value)}
                      type="number"
                      inputMode="numeric"
                    />
                  </div>

                  <button
                    type="button"
                    className="h-10 rounded-lg px-3 text-sm font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--medilec-accent)' }}
                    onClick={onAddItem}
                    disabled={saving}
                  >
                    Ajouter
                  </button>
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  Astuce: pour ajouter un produit, copie son ID depuis Admin → Produits.
                </div>
              </div>
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
