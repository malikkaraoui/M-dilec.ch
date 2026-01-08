import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { status, data, error } = useRtdbValue('/products')
  const cart = useCart()

  const q = (searchParams.get('q') || '').trim()
  const qLower = q.toLowerCase()

  const products = data && typeof data === 'object' ? Object.entries(data) : []
  const filteredProducts = qLower
    ? products.filter(([productId, p]) => {
        const name = typeof p?.name === 'string' ? p.name : ''
        const brand = typeof p?.brand === 'string' ? p.brand : ''
        const description = typeof p?.description === 'string' ? p.description : ''

        const haystack = `${productId} ${name} ${brand} ${description}`.toLowerCase()
        return haystack.includes(qLower)
      })
    : products

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Catalogue</h1>

      {status === 'not-configured' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Firebase n’est pas configuré sur cette machine.
          <div className="mt-2 text-neutral-600">
            Ajoute les variables <code className="font-mono">VITE_FIREBASE_*</code> dans{' '}
            <code className="font-mono">.env.local</code> (voir <code className="font-mono">.env.example</code>).
          </div>
        </div>
      ) : null}

      {status === 'loading' ? (
        <p className="text-sm text-neutral-600">Chargement du catalogue…</p>
      ) : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Impossible de charger les produits.
          <div className="mt-2 font-mono text-xs text-neutral-500">{String(error?.message || error)}</div>
        </div>
      ) : null}

      {status === 'success' && products.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucun produit pour le moment.
          <div className="mt-2 text-neutral-600">Ajoute des produits dans RTDB sous /products.</div>
        </div>
      ) : null}

      {status === 'success' && products.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
          <div>
            {q ? (
              <>
                Résultats pour <span className="font-medium text-neutral-900">“{q}”</span> :{' '}
                <span className="font-medium text-neutral-900">{filteredProducts.length}</span>
              </>
            ) : (
              <>
                Produits: <span className="font-medium text-neutral-900">{products.length}</span>
              </>
            )}
          </div>

          {q ? (
            <button
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              onClick={() => setSearchParams({})}
              type="button"
            >
              Effacer la recherche
            </button>
          ) : null}
        </div>
      ) : null}

      {status === 'success' && products.length > 0 && filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Aucun résultat.
          <div className="mt-2 text-neutral-600">Essayez un autre mot-clé.</div>
        </div>
      ) : null}

      {status === 'success' && filteredProducts.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map(([productId, p]) => {
            const name = p?.name || productId
            const brand = p?.brand
            const priceCents = typeof p?.priceCents === 'number' ? p.priceCents : null
            const imageURL = typeof p?.image?.downloadURL === 'string' ? p.image.downloadURL : ''

            return (
              <li
                key={productId}
                className="cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/product/${productId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/product/${productId}`)
                  }
                }}
              >
                {imageURL ? (
                  <img
                    alt={name}
                    className="mb-3 h-36 w-full rounded-xl border border-neutral-200 object-cover"
                    src={imageURL}
                    loading="lazy"
                  />
                ) : null}

                <div className="text-sm font-semibold text-neutral-900">{name}</div>
                {brand ? <div className="mt-1 text-xs text-neutral-500">{brand}</div> : null}
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
                    to={`/product/${productId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Détails
                  </Link>
                  <button
                    className="rounded-lg px-3 py-2 text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--medilec-accent)' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      cart.add({ id: productId, name, brand, priceCents })
                    }}
                    type="button"
                  >
                    Ajouter
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

      <p className="text-xs text-neutral-500">
        Étape MVP: lecture seule RTDB sur <code className="font-mono">/products</code>. Les filtres/recherche URL
        arrivent ensuite.
      </p>
    </section>
  )
}
