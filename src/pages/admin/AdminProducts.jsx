import { push, ref, remove, set, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'

import { useRtdbValue } from '../../hooks/useRtdbValue.js'
import { rtdb } from '../../lib/db.js'
import { deletePdfByStoragePath, uploadProductPdf } from '../../lib/storage.js'

const LS_QUERY_KEY = 'medilec_admin_products_query_v1'
const LS_SELECTED_KEY = 'medilec_admin_products_selected_v1'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function safeInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

export function AdminProductsPage() {
  const { status, data, error } = useRtdbValue('/products')

  const [query, setQuery] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(LS_QUERY_KEY) || ''
  })
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(LS_SELECTED_KEY) || ''
  })

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [deletingId, setDeletingId] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [deletingPdf, setDeletingPdf] = useState(false)
  const [deletePdfError, setDeletePdfError] = useState('')

  const products = useMemo(() => {
    const raw = data
    if (!raw || typeof raw !== 'object') return []

    const list = Object.entries(raw).map(([id, p]) => ({
      id,
      name: typeof p?.name === 'string' ? p.name : '',
      brand: typeof p?.brand === 'string' ? p.brand : '',
      description: typeof p?.description === 'string' ? p.description : '',
      priceCents: typeof p?.priceCents === 'number' ? p.priceCents : null,
      pdf: p?.pdf && typeof p.pdf === 'object' ? p.pdf : null,
    }))

    list.sort((a, b) => {
      const an = normalizeText(a.name || a.id)
      const bn = normalizeText(b.name || b.id)
      return an.localeCompare(bn, 'fr')
    })

    const q = normalizeText(query)
    if (!q) return list

    return list.filter((p) =>
      normalizeText(`${p.id} ${p.name} ${p.brand} ${p.description}`).includes(q),
    )
  }, [data, query])

  const selected = useMemo(() => products.find((p) => p.id === selectedId) || null, [products, selectedId])

  const [edit, setEdit] = useState(() => ({ name: '', brand: '', description: '', priceCents: '' }))

  // Synchronisation soft: quand on change d’item, on recharge le form.
  useEffect(() => {
    if (!selected) return
    setEdit({
      name: selected.name || '',
      brand: selected.brand || '',
      description: selected.description || '',
      priceCents: selected.priceCents == null ? '' : String(selected.priceCents),
    })
  }, [selectedId, selected])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LS_QUERY_KEY, query)
  }, [query])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedId) window.localStorage.setItem(LS_SELECTED_KEY, selectedId)
    else window.localStorage.removeItem(LS_SELECTED_KEY)
  }, [selectedId])

  async function onCreate() {
    setCreateError('')

    if (!rtdb) {
      setCreateError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setCreating(true)
      const productRef = push(ref(rtdb, 'products'))
      const id = productRef.key
      if (!id) throw new Error('Impossible de générer un id produit.')

      await set(productRef, {
        name: 'Nouveau produit',
        brand: '',
        description: '',
        priceCents: null,
      })

      setSelectedId(id)
    } catch (err) {
      setCreateError(err?.message || 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function onSave() {
    setSaveError('')

    if (!selectedId) return

    if (!rtdb) {
      setSaveError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    const name = String(edit.name || '').trim()
    if (!name) {
      setSaveError('Le nom est obligatoire.')
      return
    }

    const brand = String(edit.brand || '').trim()
    const description = String(edit.description || '').trim()
    const rawPrice = String(edit.priceCents || '').trim()
    const priceCents = rawPrice ? safeInt(rawPrice) : null

    if (rawPrice && priceCents == null) {
      setSaveError('priceCents doit être un nombre entier (ex: 12990).')
      return
    }

    try {
      setSaving(true)

      await update(ref(rtdb, `products/${selectedId}`), {
        name,
        brand: brand || null,
        description: description || null,
        priceCents,
      })
    } catch (err) {
      setSaveError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id) {
    setDeleteError('')

    if (!id) return

    if (!rtdb) {
      setDeleteError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    const ok = window.confirm('Supprimer ce produit ? Cette action est irréversible.')
    if (!ok) return

    try {
      setDeletingId(id)
      await remove(ref(rtdb, `products/${id}`))
      if (selectedId === id) setSelectedId('')
    } catch (err) {
      setDeleteError(err?.message || 'Suppression impossible.')
    } finally {
      setDeletingId('')
    }
  }

  async function onUploadPdf(file) {
    setUploadError('')
    setUploadProgress(0)

    if (!selectedId) return
    if (!file) return

    if (!rtdb) {
      setUploadError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setUploading(true)
      const result = await uploadProductPdf({
        productId: selectedId,
        file,
        onProgress: ({ pct }) => setUploadProgress(pct),
      })

      await update(ref(rtdb, `products/${selectedId}`), {
        pdf: {
          storagePath: result.storagePath,
          downloadURL: result.downloadURL,
        },
      })
    } catch (err) {
      setUploadError(err?.message || 'Upload impossible.')
    } finally {
      setUploading(false)
    }
  }

  async function onDeletePdf() {
    setDeletePdfError('')
    if (!selectedId) return
    if (!selected?.pdf) return

    const storagePath = typeof selected.pdf?.storagePath === 'string' ? selected.pdf.storagePath : ''
    const ok = window.confirm('Supprimer le PDF de ce produit ?')
    if (!ok) return

    if (!rtdb) {
      setDeletePdfError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setDeletingPdf(true)

      // 1) supprimer l’objet Storage (si on connaît le path)
      if (storagePath) {
        await deletePdfByStoragePath(storagePath)
      }

      // 2) nettoyer RTDB
      await update(ref(rtdb, `products/${selectedId}`), {
        pdf: null,
      })
    } catch (err) {
      setDeletePdfError(err?.message || 'Suppression PDF impossible.')
    } finally {
      setDeletingPdf(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
          <p className="mt-1 text-sm text-neutral-600">CRUD minimal (admin) sur /products.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            onClick={onCreate}
            disabled={creating}
            type="button"
          >
            {creating ? 'Création…' : '+ Nouveau'}
          </button>

          <div className="w-full sm:w-80">
            <label className="sr-only" htmlFor="admin-products-search">
              Rechercher
            </label>
            <input
              id="admin-products-search"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              placeholder="Recherche (nom, marque…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
            />
          </div>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Chargement…</div>
      ) : null}

      {status === 'error' || error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Lecture des produits impossible (droits admin requis).
        </div>
      ) : null}

      {createError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{createError}</div>
      ) : null}

      {deleteError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{deleteError}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr,420px]">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Marque</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => (
                  <tr key={p.id} className={p.id === selectedId ? 'bg-neutral-50' : undefined}>
                    <td className="px-4 py-3">
                      <button
                        className="text-left font-medium text-neutral-900 hover:underline"
                        onClick={() => setSelectedId(p.id)}
                        type="button"
                      >
                        {p.name || p.id}
                      </button>
                      <div className="mt-1 font-mono text-[11px] text-neutral-500">{p.id}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{p.brand || '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {typeof p.priceCents === 'number' ? `${(p.priceCents / 100).toFixed(2)} CHF` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-sm text-red-700 hover:underline disabled:opacity-60"
                        disabled={deletingId === p.id}
                        onClick={() => onDelete(p.id)}
                        type="button"
                      >
                        {deletingId === p.id ? 'Suppression…' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Édition</h2>

          {!selected ? (
            <div className="mt-2 text-sm text-neutral-600">Sélectionnez un produit dans la liste.</div>
          ) : (
            <>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  onSave()
                }}
              >
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="admin-product-name">
                    Nom
                  </label>
                  <input
                    id="admin-product-name"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                    value={edit.name}
                    onChange={(e) => setEdit((prev) => ({ ...prev, name: e.target.value }))}
                    type="text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="admin-product-brand">
                    Marque
                  </label>
                  <input
                    id="admin-product-brand"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                    value={edit.brand}
                    onChange={(e) => setEdit((prev) => ({ ...prev, brand: e.target.value }))}
                    type="text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="admin-product-price">
                    Prix (centimes)
                  </label>
                  <input
                    id="admin-product-price"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                    value={edit.priceCents}
                    onChange={(e) => setEdit((prev) => ({ ...prev, priceCents: e.target.value }))}
                    type="number"
                    inputMode="numeric"
                    placeholder="ex: 12990"
                  />
                  <div className="text-xs text-neutral-500">Laissez vide pour “prix sur demande”.</div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="admin-product-description">
                    Description
                  </label>
                  <textarea
                    id="admin-product-description"
                    className="min-h-28 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                    value={edit.description}
                    onChange={(e) => setEdit((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description (optionnel)"
                  />
                </div>

                {saveError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {saveError}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--medilec-accent)' }}
                  disabled={saving}
                  type="submit"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-semibold text-neutral-900">PDF (fiche technique)</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Upload direct via le navigateur (Firebase Storage). Lecture publique.
              </p>

              {uploadError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {uploadError}
                </div>
              ) : null}

              {deletePdfError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {deletePdfError}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                {selected?.pdf?.downloadURL ? (
                  <a
                    className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    href={selected.pdf.downloadURL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Ouvrir le PDF
                  </a>
                ) : (
                  <div className="text-sm text-neutral-600">Aucun PDF attaché.</div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-700" htmlFor="admin-product-pdf">
                    Importer / remplacer
                  </label>
                  <input
                    id="admin-product-pdf"
                    className="mt-1 block w-full text-sm"
                    type="file"
                    accept="application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.currentTarget.files && e.currentTarget.files[0]
                      if (!file) return
                      onUploadPdf(file)
                      // reset input to allow re-upload of same file
                      e.currentTarget.value = ''
                    }}
                  />
                  {uploading ? (
                    <div className="mt-2 text-xs text-neutral-500">Upload… {uploadProgress}%</div>
                  ) : null}
                </div>

                {selected?.pdf ? (
                  <button
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
                    disabled={deletingPdf}
                    onClick={onDeletePdf}
                    type="button"
                  >
                    {deletingPdf ? 'Suppression…' : 'Supprimer le PDF'}
                  </button>
                ) : null}
              </div>
            </div>
            </>
          )}
        </aside>
      </div>

      <p className="text-xs text-neutral-500">
        Notes: la page suppose un claim <code className="font-mono">admin=true</code> pour la lecture/écriture.
      </p>
    </section>
  )
}
