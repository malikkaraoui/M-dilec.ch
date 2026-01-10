/*
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PublishJobPanel } from '../../components/admin/PublishJobPanel.jsx'
import { deleteCatalogProduct } from '../../lib/catalogPublisher.js'
import { clearCatalogCache, listProductsIndex, pad6 } from '../../lib/catalog.js'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function AdminProductsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [items, setItems] = useState(() => [])

  const [query, setQuery] = useState('')

  const [jobId, setJobId] = useState('')
  const [actionError, setActionError] = useState('')

  async function reloadIndex({ cacheBust } = {}) {
    setError('')
    setStatus('loading')
    try {
      const idx = await listProductsIndex(cacheBust ? { cacheBust } : undefined)
      setItems(Array.isArray(idx) ? idx : [])
      setStatus('success')
    } catch (e) {
      setItems([])
      setStatus('error')
      setError(String(e?.message || e))
    }
  }

  useEffect(() => {
    reloadIndex()
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const list = Array.isArray(items) ? items : []
    if (!q) return list
    return list.filter((p) =>
      normalizeText(`${p?.id ?? ''} ${p?.name ?? ''} ${p?.manufacturer_name ?? ''} ${p?.slug ?? ''}`).includes(q),
    )
  }, [items, query])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produits (catalogue)</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Source de vérité: <span className="font-mono text-xs">public/catalog</span> (index JSON). Actions via publisher localhost.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
            to="/admin/products/new"
          >
            + Ajouter
          </Link>
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
            onClick={() => reloadIndex({ cacheBust: Date.now() })}
          >
            Rafraîchir
          </button>
        </div>
      </div>

      <label className="block">
        <div className="text-sm font-medium">Recherche</div>
        <input
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, fabricant, slug…"
        />
      </label>

      {status === 'loading' ? <p className="text-sm text-neutral-600">Chargement…</p> : null}
      {status === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</div>
      ) : null}

      {jobId ? (
        <PublishJobPanel
          jobId={jobId}
          onDone={(state) => {
            if (state?.status === 'success') {
              clearCatalogCache()
              reloadIndex({ cacheBust: jobId })
            }
          }}
        />
      ) : null}

      <div className="overflow-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-600">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Fabricant</th>
              <th className="px-3 py-2">Prix HT</th>
              <th className="px-3 py-2">Actif</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p?.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-mono text-xs">{pad6(p?.id)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-neutral-900">{p?.name}</div>
                  <div className="text-xs text-neutral-500 font-mono">{p?.slug}</div>
                </td>
                <td className="px-3 py-2">{p?.manufacturer_name || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{p?.price_ht != null ? Number(p.price_ht).toFixed(2) : '—'}</td>
                <td className="px-3 py-2">{p?.active ? 'oui' : 'non'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
*/

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PublishJobPanel } from '../../components/admin/PublishJobPanel.jsx'
import { deleteCatalogProduct } from '../../lib/catalogPublisher.js'
import { clearCatalogCache, listProductsIndex, pad6 } from '../../lib/catalog.js'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function AdminProductsPage() {
                  const [status, setStatus] = useState('loading')
                  const [error, setError] = useState('')
                  const [items, setItems] = useState(() => [])

                  const [query, setQuery] = useState('')

                  const [jobId, setJobId] = useState('')
                  const [actionError, setActionError] = useState('')

                  async function reloadIndex({ cacheBust } = {}) {
                    setError('')
                    setStatus('loading')
                    try {
                      const idx = await listProductsIndex(cacheBust ? { cacheBust } : undefined)
                      setItems(Array.isArray(idx) ? idx : [])
                      setStatus('success')
                    } catch (e) {
                      setItems([])
                      setStatus('error')
                      setError(String(e?.message || e))
                    }
                  }

                  useEffect(() => {
                    reloadIndex()
                  }, [])

                  const filtered = useMemo(() => {
                    const q = normalizeText(query)
                    const list = Array.isArray(items) ? items : []
                    if (!q) return list
                    return list.filter((p) =>
                      normalizeText(`${p?.id ?? ''} ${p?.name ?? ''} ${p?.manufacturer_name ?? ''} ${p?.slug ?? ''}`).includes(q),
                    )
                  }, [items, query])

                  return (
                    <section className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h1 className="text-2xl font-semibold tracking-tight">Produits (catalogue)</h1>
                          <p className="mt-1 text-sm text-neutral-600">
                            Source de vérité: <span className="font-mono text-xs">public/catalog</span> (index JSON). Actions via publisher localhost.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                            to="/admin/products/new"
                          >
                            + Ajouter
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                            onClick={() => reloadIndex({ cacheBust: Date.now() })}
                          >
                            Rafraîchir
                          </button>
                        </div>
                      </div>

                      <label className="block">
                        <div className="text-sm font-medium">Recherche</div>
                        <input
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Nom, fabricant, slug…"
                        />
                      </label>

                      {status === 'loading' ? <p className="text-sm text-neutral-600">Chargement…</p> : null}
                      {status === 'error' ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
                      ) : null}

                      {actionError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</div>
                      ) : null}

                      {jobId ? (
                        <PublishJobPanel
                          jobId={jobId}
                          onDone={(state) => {
                            if (state?.status === 'success') {
                              clearCatalogCache()
                              reloadIndex({ cacheBust: jobId })
                            }
                          }}
                        />
                      ) : null}

                      <div className="overflow-auto rounded-xl border border-neutral-200 bg-white">
                        <table className="min-w-full text-sm">
                          <thead className="bg-neutral-50 text-left text-xs text-neutral-600">
                            <tr>
                              <th className="px-3 py-2">ID</th>
                              <th className="px-3 py-2">Nom</th>
                              <th className="px-3 py-2">Fabricant</th>
                              <th className="px-3 py-2">Prix HT</th>
                              <th className="px-3 py-2">Actif</th>
                              <th className="px-3 py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((p) => (
                              <tr key={p?.id} className="border-t border-neutral-100">
                                <td className="px-3 py-2 font-mono text-xs">{pad6(p?.id)}</td>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-neutral-900">{p?.name}</div>
                                  <div className="text-xs text-neutral-500 font-mono">{p?.slug}</div>
                                </td>
                                <td className="px-3 py-2">{p?.manufacturer_name || '—'}</td>
                                <td className="px-3 py-2 font-mono text-xs">{p?.price_ht != null ? Number(p.price_ht).toFixed(2) : '—'}</td>
                                <td className="px-3 py-2">{p?.active ? 'oui' : 'non'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    <Link
                                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                                      to={`/admin/products/${encodeURIComponent(String(p?.id))}/edit`}
                                    >
                                      Éditer
                                    </Link>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                      onClick={async () => {
                                        const ok = window.confirm(`Supprimer le produit #${p?.id} ?`)
                                        if (!ok) return
                                        try {
                                          setActionError('')
                                          const jid = await deleteCatalogProduct({ id: p?.id })
                                          if (!jid) throw new Error('jobId manquant')
                                          setJobId(String(jid))
                                        } catch (e) {
                                          setActionError(String(e?.message || e))
                                        }
                                      }}
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {!filtered.length && status === 'success' ? (
                              <tr>
                                <td className="px-3 py-6 text-center text-sm text-neutral-600" colSpan={6}>
                                  Aucun produit.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )
                }

/*
 * LEGACY (Firebase/RTDB)
 * ---------------------
 * Ancienne version de l'écran admin produits. Conservée temporairement
 * pour référence mais désactivée : désormais, le CRUD catalogue passe
 * par `public/catalog` + publisher localhost.
 *

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
        slug: slugify('Nouveau produit'),
        brand: '',
        description: '',
        priceCents: null,
        // minimum 1 catégorie côté admin (fallback: première catégorie disponible)
        categorySlugs: defaultCategorySlug ? [defaultCategorySlug] : null,
      })

      setSelectedId(id)
      setLastCreatedId(id)
    } catch (err) {
      setCreateError(err?.message || 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  function resetFormToInitial() {
    setEdit({ name: '', brand: '', description: '', priceCents: '', categorySlugs: [] })
    setBrandChoice('')
    setBrandAddError('')
    setSaveError('')
    setSaveOk(false)
  }

  async function onSave() {
    setSaveError('')
    setSaveOk(false)

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

    const categorySlugs = uniqSlugs(edit.categorySlugs)
    if (categorySlugs.length < 1 && categoryOptions.length) {
      setSaveError('Choisissez au moins 1 catégorie.')
      return
    }

    if (categorySlugs.length > 5) {
      setSaveError('Vous pouvez sélectionner 5 catégories maximum.')
      return
    }

    if (rawPrice && priceCents == null) {
      setSaveError('priceCents doit être un nombre entier (ex: 12990).')
      return
    }

    try {
      setSaving(true)

      await update(ref(rtdb, `products/${selectedId}`), {
        name,
        slug: slugify(name),
        brand: brand || null,
        description: description || null,
        priceCents,
        categorySlugs: categorySlugs.length ? categorySlugs : null,
      })

      setSaveOk(true)
      window.setTimeout(() => setSaveOk(false), 1200)

      // UX: après la création d’un nouveau produit (pas l’édition), on réinitialise le formulaire.
      if (lastCreatedId && selectedId === lastCreatedId) {
        setLastCreatedId('')
        setSelectedId('')
        resetFormToInitial()
      }
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

  async function onUploadImage(file) {
    setUploadImageError('')
    setUploadImageProgress(0)

    if (!selectedId) return
    if (!file) return

    if (!rtdb) {
      setUploadImageError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setUploadingImage(true)
      const result = await uploadProductImage({
        productId: selectedId,
        file,
        onProgress: ({ pct }) => setUploadImageProgress(pct),
      })

      await update(ref(rtdb, `products/${selectedId}`), {
        image: {
          storagePath: result.storagePath,
          downloadURL: result.downloadURL,
        },
      })
    } catch (err) {
      setUploadImageError(err?.message || 'Upload image impossible.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function onDeleteImage() {
    setDeleteImageError('')
    if (!selectedId) return
    if (!selected?.image) return

    const storagePath = typeof selected.image?.storagePath === 'string' ? selected.image.storagePath : ''
    const ok = window.confirm('Supprimer la photo de ce produit ?')
    if (!ok) return

    if (!rtdb) {
      setDeleteImageError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setDeletingImage(true)

      if (storagePath) {
        await deleteImageByStoragePath(storagePath)
      }

      await update(ref(rtdb, `products/${selectedId}`), {
        image: null,
      })
    } catch (err) {
      setDeleteImageError(err?.message || 'Suppression image impossible.')
    } finally {
      setDeletingImage(false)
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
                id="admin-product-form"
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

                  <div className="space-y-2">
                    <select
                      id="admin-product-brand"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      value={brandChoice}
                      onChange={(e) => {
                        const v = String(e.target.value || '')
                        setBrandChoice(v)
                        setBrandAddError('')
                        if (v === BRAND_OTHER_VALUE) {
                          // on garde la valeur actuelle pour permettre l’édition (ou on laisse vide)
                          return
                        }
                        setEdit((prev) => ({ ...prev, brand: v }))
                      }}
                    >
                      <option value="">—</option>
                      {allBrandOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value={BRAND_OTHER_VALUE}>Autre…</option>
                    </select>

                    {manufacturersLoadError ? (
                      <div className="text-xs text-amber-700">{manufacturersLoadError}</div>
                    ) : null}

                    {!manufacturersLoadError && allBrandOptions.length === 0 ? (
                      <div className="text-xs text-neutral-500">
                        Aucune marque référencée pour l’instant. Choisissez “Autre…” pour en ajouter une.
                      </div>
                    ) : null}

                    {brandChoice === BRAND_OTHER_VALUE ? (
                      <div className="space-y-1">
                        <label className="sr-only" htmlFor="admin-product-brand-other">
                          Nouvelle marque
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id="admin-product-brand-other"
                            className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                            style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                            value={edit.brand}
                            onChange={(e) => {
                              setBrandAddError('')
                              setEdit((prev) => ({ ...prev, brand: e.target.value }))
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              e.stopPropagation()
                              onAddBrand()
                            }}
                            onBlur={() => {
                              const next = normalizeBrand(edit.brand)
                              if (!next) return
                              setEdit((prev) => ({ ...prev, brand: next }))
                            }}
                            type="text"
                            placeholder="Saisir une nouvelle marque (ex: Nihon Kohden)"
                          />
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                            style={{ backgroundColor: 'var(--medilec-accent)' }}
                            onClick={onAddBrand}
                            disabled={!String(edit.brand || '').trim()}
                          >
                            Ajouter la marque
                          </button>
                        </div>
                        {brandAddError ? <div className="text-xs text-red-700">{brandAddError}</div> : null}
                        <div className="text-xs text-neutral-500">
                          La première lettre sera mise en majuscule. Cette marque sera disponible à l’avenir dans la liste.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="admin-product-category-add">
                    Catégories (1 min, 5 max)
                  </label>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <select
                        id="admin-product-category-add"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                        value=""
                        onChange={(e) => {
                          const slug = String(e.target.value || '').trim()
                          if (!slug) return
                          setEdit((prev) => {
                            const cur = uniqSlugs(prev.categorySlugs)
                            if (cur.includes(slug)) return prev
                            if (cur.length >= 5) return prev
                            return { ...prev, categorySlugs: [...cur, slug] }
                          })
                        }}
                        disabled={!categoryOptions.length}
                      >
                        <option value="">Ajouter une catégorie…</option>
                        {categoryOptions.map((o) => (
                          <option key={o.slug} value={o.slug}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {selectedCategorySlugs.length}/5
                    </div>
                  </div>

                  {categoriesLoadError ? (
                    <div className="text-xs text-amber-700">{categoriesLoadError}</div>
                  ) : null}

                  {categoryOptions.length && selectedCategorySlugs.length < 1 ? (
                    <div className="text-xs text-red-700">Minimum 1 catégorie requise.</div>
                  ) : null}

                  {selectedCategorySlugs.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCategorySlugs.map((slug) => (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700"
                        >
                          <span className="truncate">{categoryLabelBySlug.get(slug) || slug}</span>
                          <span className="font-mono text-[11px] text-neutral-500">{slug}</span>
                          <button
                            type="button"
                            className="text-neutral-500 hover:text-neutral-900"
                            onClick={() =>
                              setEdit((prev) => ({
                                ...prev,
                                categorySlugs: uniqSlugs(prev.categorySlugs).filter((x) => x !== slug),
                              }))
                            }
                            aria-label={`Retirer ${slug}`}
                            title="Retirer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500">Aucune catégorie sélectionnée.</div>
                  )}
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
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4">
                <h3 className="text-sm font-semibold text-neutral-900">Photo</h3>
                <p className="mt-1 text-xs text-neutral-500">Upload direct via le navigateur (Firebase Storage). Lecture publique.</p>

                {uploadImageError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {uploadImageError}
                  </div>
                ) : null}

                {deleteImageError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {deleteImageError}
                  </div>
                ) : null}

                <div className="mt-3 space-y-2">
                  {selected?.image?.downloadURL ? (
                    <div className="space-y-2">
                      <img
                        alt="Photo produit"
                        className="h-36 w-full rounded-lg border border-neutral-200 object-cover"
                        src={selected.image.downloadURL}
                        loading="lazy"
                      />
                      <a
                        className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                        href={selected.image.downloadURL}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir l’image
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-600">Aucune photo attachée.</div>
                  )}

                  <div>
                    <input
                      id="admin-product-image"
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      ref={imageInputRef}
                      onChange={(e) => {
                        const file = e.currentTarget.files && e.currentTarget.files[0]
                        if (!file) return
                        onUploadImage(file)
                        e.currentTarget.value = ''
                      }}
                    />

                    <button
                      className="mt-1 inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
                      disabled={uploadingImage}
                      onClick={() => imageInputRef.current?.click?.()}
                      type="button"
                    >
                      {selected?.image ? 'Remplacer la photo…' : 'Ajouter une photo…'}
                    </button>
                    {uploadingImage ? (
                      <div className="mt-2 text-xs text-neutral-500">Upload… {uploadImageProgress}%</div>
                    ) : null}
                  </div>

                  {selected?.image ? (
                    <button
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
                      disabled={deletingImage}
                      onClick={onDeleteImage}
                      type="button"
                    >
                      {deletingImage ? 'Suppression…' : 'Supprimer la photo'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-semibold text-neutral-900">PDF (fiche technique)</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Upload direct via le navigateur (Firebase Storage). Lecture publique.
              </p>

              {!selected?.pdf?.downloadURL ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  PDF manquant. Pour le catalogue final, chaque produit devrait avoir sa fiche PDF.
                </div>
              ) : null}

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
                  <input
                    id="admin-product-pdf"
                    className="sr-only"
                    type="file"
                    accept="application/pdf"
                    disabled={uploading}
                    ref={pdfInputRef}
                    onChange={(e) => {
                      const file = e.currentTarget.files && e.currentTarget.files[0]
                      if (!file) return
                      onUploadPdf(file)
                      // reset input to allow re-upload of same file
                      e.currentTarget.value = ''
                    }}
                  />

                  <button
                    className="mt-1 inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
                    disabled={uploading}
                    onClick={() => pdfInputRef.current?.click?.()}
                    type="button"
                  >
                    {selected?.pdf ? 'Remplacer le PDF…' : 'Ajouter un PDF…'}
                  </button>
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

            <div className="mt-6 border-t border-neutral-200 pt-4">
              <button
                className={
                  saveOk
                    ? 'w-full rounded-lg px-3 py-2 text-sm font-semibold text-white ring-2 ring-offset-2 disabled:opacity-60'
                    : 'w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60'
                }
                style={{
                  backgroundColor: 'var(--medilec-accent)',
                  '--tw-ring-color': 'rgba(213, 43, 30, 0.28)',
                }}
                disabled={saving}
                form="admin-product-form"
                type="submit"
              >
                {saving ? 'Enregistrement…' : saveOk ? 'Enregistré' : 'Enregistrer'}
              </button>

              <div className="mt-2 text-xs text-neutral-500">
                Astuce: vous pouvez aussi appuyer sur Entrée dans les champs.
              </div>
            </div>
            </>
          )}
        </aside>
      </div>

      <p className="text-xs text-neutral-500">
        Notes: la page suppose un claim <code className="font-mono">role="admin"</code> pour la lecture/écriture.
      </p>
    </section>
  )
}

*/
