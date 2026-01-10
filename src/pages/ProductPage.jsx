import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { assetUrl, getProductById, listProductsIndex } from '../lib/catalog.js'

function pickBestImage(files) {
  if (!Array.isArray(files)) return ''
  const large = files.find((f) => typeof f === 'string' && f.includes('large_default'))
  if (typeof large === 'string' && large) return large
  const original = files.find((f) => typeof f === 'string' && /\/\d+\.jpg$/.test(f))
  if (typeof original === 'string' && original) return original
  const first = files.find((f) => typeof f === 'string' && f)
  return typeof first === 'string' ? first : ''
}

export function ProductPage() {
  const { slug } = useParams()
  const key = slug || ''
  return <ProductPageInner key={key} slug={slug} />
}

function ProductPageInner({ slug }) {
  const navigate = useNavigate()
  const location = useLocation()
  const cart = useCart()

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [id, setId] = useState(null)
  const [indexEntry, setIndexEntry] = useState(null)
  const [product, setProduct] = useState(null)

  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    if (!justAdded) return
    const t = window.setTimeout(() => setJustAdded(false), 900)
    return () => window.clearTimeout(t)
  }, [justAdded])

  useEffect(() => {
    const ac = new AbortController()

    ;(async () => {
      const s = String(slug || '').trim()
      if (!s) {
        setStatus('not-found')
        return
      }

      const idx = await listProductsIndex({ signal: ac.signal })
      const entry = Array.isArray(idx) ? idx.find((p) => String(p?.slug || '') === s) : null
      const resolvedId = entry?.id ?? null

      if (!resolvedId) {
        setStatus('not-found')
        return
      }

      setId(resolvedId)
      setIndexEntry(entry || null)

      const p = await getProductById(resolvedId, { signal: ac.signal })
      setProduct(p || null)
      setStatus(p ? 'success' : 'not-found')
    })().catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setStatus('error')
    })

    return () => ac.abort()
  }, [slug])

  // Canonicalise l'URL si l'index a un slug différent (rare, mais utile).
  useEffect(() => {
    if (status !== 'success') return
    const canonicalSlug = typeof indexEntry?.slug === 'string' ? indexEntry.slug : ''
    if (!canonicalSlug) return

    const canonicalPath = `/p/${canonicalSlug}`
    if (location.pathname === canonicalPath) return

    navigate(`${canonicalPath}${location.search || ''}${location.hash || ''}`, { replace: true })
  }, [status, indexEntry?.slug, navigate, location.pathname, location.search, location.hash])

  const title = product?.name || (id != null ? `Produit #${id}` : 'Produit')
  const manufacturerName = product?.manufacturer?.name
  const priceCents = typeof product?.pricing?.price_ht === 'number' ? Math.round(product.pricing.price_ht * 100) : null

  const images = []
  // 1) si cover_image dans l’index: on la met en premier
  if (typeof indexEntry?.cover_image === 'string' && indexEntry.cover_image) {
    images.push(indexEntry.cover_image)
  }

  // 2) puis toutes les images du produit (1 entrée = 1 image). On prend une version "best".
  const imgs = product?.media?.images
  if (Array.isArray(imgs)) {
    for (const img of imgs) {
      const rel = pickBestImage(img?.files)
      if (rel) images.push(rel)
    }
  }

  const uniqueImages = Array.from(new Set(images))

  const shortHtml = typeof product?.descriptions?.short_html === 'string' ? product.descriptions.short_html : ''
  const longHtml = typeof product?.descriptions?.long_html === 'string' ? product.descriptions.long_html : ''

  const pdfMissing = Boolean(product?.media?.pdfs_missing)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/catalog">
          ← Retour au catalogue
        </Link>
      </div>

      {status === 'loading' ? <p className="text-sm text-neutral-600">Chargement…</p> : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Impossible de charger ce produit.
          <div className="mt-2 font-mono text-xs text-neutral-500">{String(error?.message || error)}</div>
        </div>
      ) : null}

      {status === 'not-found' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Produit introuvable.
        </div>
      ) : null}

      {status === 'success' && product ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-neutral-600">
            {manufacturerName ? <span>{manufacturerName}</span> : <span className="text-neutral-500">—</span>}
            {typeof product?.reference === 'string' && product.reference.trim() ? (
              <>
                <span className="mx-2 text-neutral-300">•</span>
                <span className="font-mono text-xs">ref {product.reference}</span>
              </>
            ) : null}
          </div>

          {priceCents != null ? (
            <div className="mt-3 text-lg font-semibold" style={{ color: 'var(--medilec-accent)' }}>
              {(priceCents / 100).toFixed(2)} CHF
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className={
                justAdded
                  ? 'rounded-lg px-3 py-2 text-sm font-medium text-white ring-2 ring-offset-2 transition-transform active:scale-[0.98]'
                  : 'rounded-lg px-3 py-2 text-sm font-medium text-white transition-transform active:scale-[0.98]'
              }
              style={{
                backgroundColor: 'var(--medilec-accent)',
                '--tw-ring-color': 'rgba(213, 43, 30, 0.28)',
              }}
              disabled={justAdded || id == null}
              type="button"
              onClick={() => {
                cart.add({
                  id: String(id ?? ''),
                  name: product?.name || String(id ?? ''),
                  brand: manufacturerName,
                  priceCents,
                })
                setJustAdded(true)
              }}
            >
              {justAdded ? 'Ajouté' : 'Ajouter au panier'}
            </button>

            <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/cart">
              Voir le panier
            </Link>

            {pdfMissing ? (
              <button
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-400"
                type="button"
                disabled
                title="Fiche PDF indisponible"
              >
                Fiche PDF indisponible
              </button>
            ) : null}
          </div>

          {uniqueImages.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uniqueImages.map((rel) => (
                <img
                  key={rel}
                  alt={title}
                  className="h-56 w-full rounded-2xl border border-neutral-200 object-cover"
                  src={assetUrl(rel)}
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}

          {/* HTML: on affiche tel quel (export). Si on ajoute un sanitizer plus tard, on pourra l'intégrer ici. */}
          {shortHtml ? (
            <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: shortHtml }} />
          ) : null}
          {longHtml && longHtml !== shortHtml ? (
            <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: longHtml }} />
          ) : null}

          {Array.isArray(product?.specs) && product.specs.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-base font-semibold">Spécifications</h2>
              <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-sm">
                  <tbody>
                    {product.specs.map((s, idx) => {
                      const key = String(s?.key || s?.name || idx)
                      const label = s?.label || s?.name || s?.key || '—'
                      const value = s?.value ?? s?.val ?? ''
                      return (
                        <tr key={key} className="border-t border-neutral-200 first:border-t-0">
                          <td className="w-1/3 bg-neutral-50 px-3 py-2 font-medium text-neutral-700">{label}</td>
                          <td className="px-3 py-2 text-neutral-800">{String(value)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {Array.isArray(product?.category_paths) && product.category_paths.length > 0 ? (
            <div className="mt-6 space-y-2">
              <h2 className="text-base font-semibold">Catégories</h2>
              <div className="space-y-1">
                {product.category_paths.map((path, idx) => (
                  <div key={idx} className="text-sm text-neutral-700">
                    {(Array.isArray(path) ? path : [])
                      .map((x) => x?.name)
                      .filter(Boolean)
                      .join(' / ')}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
