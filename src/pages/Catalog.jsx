import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { assetUrl, fetchJSON, listProductsIndex } from '../lib/catalog.js'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const cart = useCart()

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [productsIndex, setProductsIndex] = useState([])
  const [searchIndex, setSearchIndex] = useState(null)

  const [recentlyAddedId, setRecentlyAddedId] = useState('')

  useEffect(() => {
    if (!recentlyAddedId) return
    const t = window.setTimeout(() => setRecentlyAddedId(''), 900)
    return () => window.clearTimeout(t)
  }, [recentlyAddedId])

  useEffect(() => {
    const ac = new AbortController()

    Promise.all([
      listProductsIndex({ signal: ac.signal }),
      // Optionnel: accélère/qualifie la recherche si présent.
      fetchJSON('/catalog/index.search.json', { signal: ac.signal }).catch(() => null),
    ])
      .then(([idx, search]) => {
        setProductsIndex(Array.isArray(idx) ? idx : [])
        setSearchIndex(Array.isArray(search) ? search : null)
        setStatus('success')
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err)
        setStatus('error')
      })

    return () => ac.abort()
  }, [])

  const q = (searchParams.get('q') || '').trim()
  const qLower = q.toLowerCase()

  const haystackById = useMemo(() => {
    if (!Array.isArray(searchIndex)) return null
    const m = new Map()
    for (const e of searchIndex) {
      const id = e?.id
      if (id == null) continue
      m.set(String(id), String(e?.haystack || '').toLowerCase())
    }
    return m
  }, [searchIndex])

  const visibleProducts = useMemo(() => {
    if (!Array.isArray(productsIndex)) return []
    // Par défaut, on masque les produits explicitement inactifs.
    return productsIndex.filter((p) => p?.active !== false)
  }, [productsIndex])

  const filteredProducts = useMemo(() => {
    if (!qLower) return visibleProducts

    if (haystackById) {
      return visibleProducts.filter((p) => {
        const h = haystackById.get(String(p?.id ?? ''))
        return typeof h === 'string' && h.includes(qLower)
      })
    }

    return visibleProducts.filter((p) => {
      const id = p?.id
      const name = typeof p?.name === 'string' ? p.name : ''
      const manufacturer = typeof p?.manufacturer_name === 'string' ? p.manufacturer_name : ''
      const slug = typeof p?.slug === 'string' ? p.slug : ''

      const haystack = `${id ?? ''} ${name} ${manufacturer} ${slug}`.toLowerCase()
      return haystack.includes(qLower)
    })
  }, [visibleProducts, qLower, haystackById])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Catalogue</h1>
        <form
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <input
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none focus:ring-2 sm:w-80"
            style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
            value={q}
            onChange={(e) => {
              const next = e.target.value
              const trimmed = next.trim()
              setSearchParams(trimmed ? { q: next } : {}, { replace: true })
            }}
            placeholder="Rechercher un produit…"
            type="search"
          />
          {q ? (
            <button
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              onClick={() => setSearchParams({}, { replace: true })}
              type="button"
            >
              Effacer
            </button>
          ) : null}
        </form>
      </div>

      {status === 'loading' ? <p className="text-sm text-neutral-600">Chargement du catalogue…</p> : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Impossible de charger le catalogue exporté.
          <div className="mt-2 font-mono text-xs text-neutral-500">{String(error?.message || error)}</div>
        </div>
      ) : null}

      {status === 'success' && visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucun produit.
          <div className="mt-2 text-neutral-600">
            Vérifie que les exports sont bien copiés dans <code className="font-mono">public/catalog/</code>.
          </div>
        </div>
      ) : null}

      {status === 'success' && visibleProducts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
          <div>
            {q ? (
              <>
                Résultats pour <span className="font-medium text-neutral-900">“{q}”</span> :{' '}
                <span className="font-medium text-neutral-900">{filteredProducts.length}</span>
              </>
            ) : (
              <>
                Produits: <span className="font-medium text-neutral-900">{visibleProducts.length}</span>
              </>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            {searchIndex ? 'Recherche: index.search.json' : 'Recherche: fallback (nom / marque / slug)'}
          </div>
        </div>
      ) : null}

      {status === 'success' && visibleProducts.length > 0 && filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucun résultat.
          <div className="mt-2 text-neutral-600">Essayez un autre mot-clé.</div>
        </div>
      ) : null}

      {status === 'success' && filteredProducts.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => {
            const id = p?.id
            const slug = p?.slug
            const name = p?.name || String(id ?? '')
            const manufacturer = p?.manufacturer_name
            const priceCents = typeof p?.price_ht === 'number' ? Math.round(p.price_ht * 100) : null
            const cover = typeof p?.cover_image === 'string' && p.cover_image ? assetUrl(p.cover_image) : ''

            const href = slug ? `/p/${slug}` : id != null ? `/product/${id}` : '/catalog'

            return (
              <li
                key={String(id ?? slug ?? name)}
                className="group cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg focus-within:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                role="link"
                tabIndex={0}
                onClick={() => navigate(href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(href)
                  }
                }}
              >
                {cover ? (
                  <img
                    alt={name}
                    className="mb-3 h-36 w-full rounded-xl border border-neutral-200 object-cover"
                    src={cover}
                    loading="lazy"
                  />
                ) : null}

                <div className="text-sm font-semibold text-neutral-900">{name}</div>
                {manufacturer ? <div className="mt-1 text-xs text-neutral-500">{manufacturer}</div> : null}
                {priceCents != null ? (
                  <div className="mt-3 text-sm font-medium" style={{ color: 'var(--medilec-accent)' }}>
                    {(priceCents / 100).toFixed(2)} CHF
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-neutral-500">Prix sur demande</div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
                    to={href}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Détails
                  </Link>
                  <button
                    className={
                      recentlyAddedId === String(id)
                        ? 'rounded-lg px-3 py-2 text-xs font-medium text-white ring-2 ring-offset-2 transition-transform active:scale-[0.98]'
                        : 'rounded-lg px-3 py-2 text-xs font-medium text-white transition-transform active:scale-[0.98]'
                    }
                    style={{
                      backgroundColor: 'var(--medilec-accent)',
                      '--tw-ring-color': 'rgba(213, 43, 30, 0.28)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      cart.add({ id: String(id ?? ''), name, brand: manufacturer, priceCents })
                      setRecentlyAddedId(String(id))
                    }}
                    type="button"
                    disabled={id == null}
                  >
                    {recentlyAddedId === String(id) ? 'Ajouté' : 'Ajouter'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {cart.count > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
          Panier: <span className="font-medium">{cart.count}</span> article{cart.count > 1 ? 's' : ''}.{' '}
          <Link className="text-blue-600 hover:underline" to="/cart">
            Voir le panier
          </Link>
        </div>
      ) : null}
    </section>
  )
}
