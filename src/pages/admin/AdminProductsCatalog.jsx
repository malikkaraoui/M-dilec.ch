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
