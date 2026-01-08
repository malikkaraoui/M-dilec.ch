import { Link } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'

export function CatalogPage() {
  const { status, data, error } = useRtdbValue('/products')
  const cart = useCart()

  const products = data && typeof data === 'object' ? Object.entries(data) : []

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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(([productId, p]) => {
            const name = p?.name || productId
            const brand = p?.brand
            const priceCents = typeof p?.priceCents === 'number' ? p.priceCents : null

            return (
              <li key={productId} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
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
                  >
                    Détails
                  </Link>
                  <button
                    className="rounded-lg px-3 py-2 text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--medilec-accent)' }}
                    onClick={() => cart.add({ id: productId, name, brand, priceCents })}
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
