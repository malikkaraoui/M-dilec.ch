import { Link, useParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'

export function ProductDetailsPage() {
  const { id } = useParams()
  const { status, data: product, error } = useRtdbValue(id ? `/products/${id}` : '')
  const cart = useCart()

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Produit</h1>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/catalog">
          ← Retour au catalogue
        </Link>
      </div>

      {status === 'not-configured' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Firebase n’est pas configuré sur cette machine.
        </div>
      ) : null}

      {status === 'loading' ? <p className="text-sm text-neutral-600">Chargement…</p> : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Impossible de charger ce produit.
          <div className="mt-2 font-mono text-xs text-neutral-500">{String(error?.message || error)}</div>
        </div>
      ) : null}

      {status === 'success' && !product ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Produit introuvable.
        </div>
      ) : null}

      {status === 'success' && product ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {typeof product?.image?.downloadURL === 'string' && product.image.downloadURL ? (
            <img
              alt={product?.name || id}
              className="mb-4 h-56 w-full rounded-2xl border border-neutral-200 object-cover"
              src={product.image.downloadURL}
              loading="lazy"
            />
          ) : null}

          <div className="text-sm font-semibold text-neutral-900">{product?.name || id}</div>
          <div className="mt-1 text-sm text-neutral-600">
            {product?.brand ? <span>{product.brand}</span> : <span className="text-neutral-500">—</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--medilec-accent)' }}
              onClick={() =>
                cart.add({
                  id,
                  name: product?.name || id,
                  brand: product?.brand,
                  priceCents: typeof product?.priceCents === 'number' ? product.priceCents : null,
                })
              }
              type="button"
            >
              Ajouter au panier
            </button>
            <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/cart">
              Voir le panier
            </Link>
          </div>

          {typeof product?.description === 'string' && product.description.trim() ? (
            <p className="mt-4 text-sm text-neutral-700">{product.description}</p>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Description à venir.</p>
          )}

          {product?.pdf?.downloadURL ? (
            <div className="mt-6">
              <a
                className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                href={product.pdf.downloadURL}
                rel="noreferrer"
                target="_blank"
              >
                Télécharger la fiche PDF
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
