import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PublishJobPanel } from '../../components/admin/PublishJobPanel.jsx'
import { deleteCatalogProduct } from '../../lib/catalogPublisher.js'
import { clearCatalogCache, listProductsIndex, pad6 } from '../../lib/catalog.js'
import { Card } from '../../ui/Card.jsx'
import { Badge } from '../../ui/Badge.jsx'
import { Button } from '../../ui/Button.jsx'
import { Input } from '../../ui/Input.jsx'

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-swiss-neutral-900">Catalogue Produits</h1>
          <p className="text-sm text-swiss-neutral-500">
            Gestion du catalogue public ({filtered.length} produits)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => reloadIndex({ cacheBust: Date.now() })}>
            Rafraîchir
          </Button>
          <Button onClick={() => window.location.href = '/admin/products/new'}>
            + Ajouter un produit
          </Button>
        </div>
      </div>

      <div className="w-full md:w-96">
        <Input
          placeholder="Recherche (Nom, ID, Fabricant...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {status === 'loading' && <div className="py-8 text-center text-swiss-neutral-500">Chargement du catalogue...</div>}

      {status === 'error' && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>
      )}

      {actionError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">{actionError}</div>
      )}

      {jobId && (
        <Card className="bg-blue-50 border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Tâche en cours</h3>
          <PublishJobPanel
            jobId={jobId}
            onDone={(state) => {
              if (state?.status === 'success') {
                clearCatalogCache()
                reloadIndex({ cacheBust: jobId })
              }
            }}
          />
        </Card>
      )}

      {status === 'success' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-swiss-neutral-50 text-xs uppercase tracking-wider text-swiss-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Produit</th>
                  <th className="px-6 py-3 font-semibold">Fabricant</th>
                  <th className="px-6 py-3 font-semibold">Prix HT</th>
                  <th className="px-6 py-3 font-semibold">État</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-swiss-neutral-100">
                {filtered.map((p) => (
                  <tr key={p?.id} className="hover:bg-swiss-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-swiss-neutral-500">{pad6(p?.id)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-swiss-neutral-900">{p?.name}</div>
                      <div className="text-xs text-swiss-neutral-400 font-mono truncate max-w-[200px]">{p?.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-swiss-neutral-600">{p?.manufacturer_name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-swiss-neutral-700">
                      {p?.price_ht != null ? `${Number(p.price_ht).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p?.active ? 'success' : 'neutral'}>
                        {p?.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          className="px-3 py-1 rounded-md text-xs font-medium bg-swiss-neutral-100 text-swiss-neutral-700 hover:bg-swiss-neutral-200 transition-colors"
                          to={`/admin/products/${encodeURIComponent(String(p?.id))}/edit`}
                        >
                          Éditer
                        </Link>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-swiss-neutral-500">Aucun produit trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  )
}
