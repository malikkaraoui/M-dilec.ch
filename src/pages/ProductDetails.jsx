import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { assetUrl, findProductIdBySlug, getProductById, listProductsIndex } from '../lib/catalog.js'

export function ProductDetailsPage() {
  const { id: idParam, slug: slugParam } = useParams()
  // Astuce: on force un remount quand les paramètres changent, ce qui évite de faire
  // des setState synchrones au début d'un useEffect (règle ESLint du repo).
  const key = `${idParam || ''}|${slugParam || ''}`

  return <ProductDetailsInner key={key} idParam={idParam} slugParam={slugParam} />
}

function ProductDetailsInner({ idParam, slugParam }) {
  const navigate = useNavigate()
  const location = useLocation()
  const cart = useCart()

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [resolvedId, setResolvedId] = useState(null)
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
      let id = null

      if (idParam != null && String(idParam).trim()) {
        const parsed = Number.parseInt(String(idParam), 10)
        id = Number.isFinite(parsed) ? parsed : null
      }

      if (!id && slugParam) {
        id = await findProductIdBySlug(slugParam, { signal: ac.signal })
      }

      if (!id) {
        setStatus('not-found')
        return
      }

      setResolvedId(id)

      // On garde l'entrée d’index sous la main: cover_image, slug canonique, etc.
      const idx = await listProductsIndex({ signal: ac.signal })
      const entry = Array.isArray(idx) ? idx.find((p) => Number(p?.id) === Number(id)) : null
      setIndexEntry(entry || null)

      const p = await getProductById(id, { signal: ac.signal })
      setProduct(p || null)
      setStatus(p ? 'success' : 'not-found')
    })().catch((err) => {
      if (err?.name === 'AbortError') return
      setError(err)
      setStatus('error')
    })

    return () => ac.abort()
  }, [idParam, slugParam])

  // URL canonique: /p/:slug (slug issu de l'index exporté)
  useEffect(() => {
    if (status !== 'success') return
    const canonicalSlug = typeof indexEntry?.slug === 'string' ? indexEntry.slug : ''
    if (!canonicalSlug) return

    const canonicalPath = `/p/${canonicalSlug}`
    if (location.pathname === canonicalPath) return

    navigate(`${canonicalPath}${location.search || ''}${location.hash || ''}`, { replace: true })
  }, [status, indexEntry?.slug, navigate, location.pathname, location.search, location.hash])

  const title = product?.name || (resolvedId != null ? `Produit #${resolvedId}` : 'Produit')
  const manufacturerName = product?.manufacturer?.name
  const priceCents = typeof product?.pricing?.price_ht === 'number' ? Math.round(product.pricing.price_ht * 100) : null

  let coverUrl = ''
  if (typeof indexEntry?.cover_image === 'string' && indexEntry.cover_image) {
    coverUrl = assetUrl(indexEntry.cover_image)
  } else {
    // Fallback: première image "large" si possible.
    const files = product?.media?.images?.[0]?.files
    if (Array.isArray(files)) {
      const large = files.find((f) => typeof f === 'string' && f.includes('large_default'))
      const first = typeof large === 'string' ? large : files.find((f) => typeof f === 'string' && f)
      coverUrl = first ? assetUrl(first) : ''
    }
  }

  const shortHtml = typeof product?.descriptions?.short_html === 'string' ? product.descriptions.short_html : ''
  const longHtml = typeof product?.descriptions?.long_html === 'string' ? product.descriptions.long_html : ''

  const pdfMissing = Boolean(product?.media?.pdfs_missing)
  const pdfFile = Array.isArray(product?.media?.pdfs) ? product.media.pdfs.find((p) => typeof p === 'string' && p) : null
  const pdfHref = pdfFile ? assetUrl(pdfFile) : null

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
          {coverUrl ? (
            <img
              alt={title}
              className="mb-4 h-56 w-full rounded-2xl border border-neutral-200 object-cover"
              src={coverUrl}
              loading="lazy"
            />
          ) : null}

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
              disabled={justAdded || resolvedId == null}
              onClick={() => {
                cart.add({
                  id: String(resolvedId ?? ''),
                  name: product?.name || String(resolvedId ?? ''),
                  brand: manufacturerName,
                  priceCents,
                })
                setJustAdded(true)
              }}
              type="button"
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
            ) : pdfHref ? (
              <a
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                href={pdfHref}
                rel="noreferrer"
                target="_blank"
              >
                Télécharger la fiche PDF
              </a>
            ) : null}
          </div>

          {Array.isArray(product?.categories) && product.categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.categories.slice(0, 8).map((c) => (
                <span
                  key={String(c?.id ?? c?.name)}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700"
                >
                  {c?.name}
                </span>
              ))}
            </div>
          ) : null}

          {/* NB: descriptions.*_html proviennent de l’export; affichage HTML assumé. */}
          {shortHtml ? (
            <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: shortHtml }} />
          ) : null}

          {longHtml && longHtml !== shortHtml ? (
            <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: longHtml }} />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
