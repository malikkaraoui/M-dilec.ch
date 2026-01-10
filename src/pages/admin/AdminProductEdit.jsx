import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CategoryPicker } from '../../components/admin/CategoryPicker.jsx'
import { PublishJobPanel } from '../../components/admin/PublishJobPanel.jsx'
import { updateCatalogProduct } from '../../lib/catalogPublisher.js'
import { assetUrl, clearCatalogCache, getProductById, listCategories, listManufacturers, pad6 } from '../../lib/catalog.js'
import { slugify } from '../../lib/slug.js'

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ensureParagraphHtml(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('<') && raw.endsWith('>')) return raw
  const escaped = escapeHtml(raw).replace(/\n/g, '<br />')
  return `<p>${escaped}</p>`
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function uniqNumbers(list) {
  const out = []
  const seen = new Set()
  for (const x of Array.isArray(list) ? list : []) {
    const n = Number(x)
    if (!Number.isFinite(n)) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function AdminProductEditPage() {
  const { id } = useParams()

  const productId = useMemo(() => {
    const n = Number(id)
    return Number.isFinite(n) ? Math.trunc(n) : null
  }, [id])

  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState('')

  const [categories, setCategories] = useState(() => [])
  const [manufacturers, setManufacturers] = useState(() => [])
  const [taxReloadToken, setTaxReloadToken] = useState(0)

  const [name, setName] = useState('')
  const [reference, setReference] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [categoryIds, setCategoryIds] = useState(() => [])
  const [priceHt, setPriceHt] = useState('')
  const [active, setActive] = useState(false)

  const [shortHtml, setShortHtml] = useState('')
  const [longHtml, setLongHtml] = useState('')

  const [specs, setSpecs] = useState(() => [])

  const [imageFile, setImageFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [removePdf, setRemovePdf] = useState(false)

  const [currentCover, setCurrentCover] = useState('')
  const [currentPdfs, setCurrentPdfs] = useState(() => [])

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [jobId, setJobId] = useState('')
  const [publishResult, setPublishResult] = useState(null)

  const draftSlug = useMemo(() => slugify(name), [name])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      ctrl.abort()
    }, 10_000)

    async function run() {
      if (productId == null) {
        setLoadError('ID produit invalide')
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError('')
      setLoadProgress(0)

      try {
        const cats = await listCategories({ signal: ctrl.signal })
        if (cancelled) return
        setLoadProgress(33)

        const mans = await listManufacturers({ signal: ctrl.signal })
        if (cancelled) return
        setLoadProgress(67)

        const product = await getProductById(productId, { signal: ctrl.signal })
        if (cancelled) return
        setLoadProgress(100)

        const catsArr = Array.isArray(cats?.categories) ? cats.categories : []
        const mansArr = Array.isArray(mans?.manufacturers) ? mans.manufacturers : []

        const p = product && typeof product === 'object' ? product : {}

        const pName = String(p?.name || '').trim()
        const pRef = String(p?.reference || '').trim()
        const pManId = p?.manufacturer?.id != null ? String(p.manufacturer.id) : ''
        const pCatIds = Array.isArray(p?.categories)
          ? p.categories.map((c) => c?.id).filter((x) => x != null)
          : Array.isArray(p?.categories_ids)
            ? p.categories_ids
            : []

        const pPrice = p?.pricing?.price_ht
        const pActive = Boolean(p?.active)

        const pShort = String(p?.descriptions?.short_html || '').trim()
        const pLong = String(p?.descriptions?.long_html || '').trim()

        const pSpecs = Array.isArray(p?.specs) ? p.specs : []

        const cover = (() => {
          // admin: media.images[0].files[0]
          const files = p?.media?.images?.[0]?.files
          if (Array.isArray(files) && files[0]) return String(files[0])
          return ''
        })()

        const pdfs = Array.isArray(p?.media?.pdfs) ? p.media.pdfs : []

        if (!cancelled) {
          setCategories(catsArr)
          setManufacturers(mansArr)

          setName(pName)
          setReference(pRef)
          setManufacturerId(pManId)
          setCategoryIds(pCatIds)
          setPriceHt(pPrice != null ? String(pPrice) : '')
          setActive(pActive)
          setShortHtml(pShort)
          setLongHtml(pLong)
          setSpecs(
            pSpecs.map((s) => ({
              name: String(s?.name || ''),
              value: String(s?.value || ''),
            })),
          )

          setCurrentCover(cover)
          setCurrentPdfs(pdfs.map((x) => String(x)))
        }
      } catch (e) {
        if (cancelled) return
        setLoadError(timedOut ? 'Timeout: chargement impossible (taxonomies ou produit). Vérifiez /catalog/* et le serveur Vite.' : String(e?.message || e))
      } finally {
        window.clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
      ctrl.abort()
      window.clearTimeout(timeout)
    }
  }, [productId, taxReloadToken])

  const manufacturersById = useMemo(() => {
    const m = new Map()
    for (const x of Array.isArray(manufacturers) ? manufacturers : []) {
      const id2 = x?.id
      if (id2 == null) continue
      const n = Number(id2)
      const name2 = String(x?.name || '').trim()
      if (!Number.isFinite(n) || !name2) continue
      m.set(n, { id: n, name: name2 })
    }
    return m
  }, [manufacturers])

  const manufacturerOptions = useMemo(() => {
    const out = Array.from(manufacturersById.values())
    out.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    return out
  }, [manufacturersById])

  const categoriesById = useMemo(() => {
    const m = new Map()
    for (const c of Array.isArray(categories) ? categories : []) {
      const id2 = c?.id
      if (id2 == null) continue
      const n = Number(id2)
      if (!Number.isFinite(n)) continue
      m.set(n, c)
    }
    return m
  }, [categories])

  const homeCategoryId = useMemo(() => {
    const all = Array.isArray(categories) ? categories : []
    const home = all.find((c) => String(c?.slug || '') === 'home')
    if (home?.id != null) return Number(home.id)

    const root = all.find((c) => String(c?.slug || '') === 'root')
    const child = Array.isArray(root?.children_ids) ? root.children_ids[0] : null
    const n = Number(child)
    return Number.isFinite(n) ? n : null
  }, [categories])

  const categoryOptions = useMemo(() => {
    const all = Array.isArray(categories) ? categories : []
    if (!all.length) return []

    const cache = new Map()
    function labelFor(cat) {
      const id2 = Number(cat?.id)
      if (!Number.isFinite(id2)) return ''
      if (cache.has(id2)) return cache.get(id2)

      const names = []
      let cur = cat
      let guard = 0
      while (cur && guard < 30) {
        const nm = String(cur?.name || '').trim()
        if (nm) names.push(nm)

        const pid2 = Number(cur?.id_parent)
        if (!Number.isFinite(pid2) || pid2 <= 0) break
        if (homeCategoryId != null && pid2 === homeCategoryId) break

        cur = categoriesById.get(pid2)
        guard += 1
      }

      const out = names.reverse().join(' › ')
      cache.set(id2, out)
      return out
    }

    const out = all
      .filter((c) => {
        if (!c || typeof c !== 'object') return false
        if (c.active === false) return false
        const slug2 = String(c.slug || '').trim()
        if (!slug2 || slug2 === 'root' || slug2 === 'home') return false
        return true
      })
      .map((c) => {
        const id2 = Number(c?.id)
        if (!Number.isFinite(id2)) return null
        const label = labelFor(c) || String(c?.name || id2)
        return { id: id2, label }
      })
      .filter(Boolean)

    out.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    return out
  }, [categories, categoriesById, homeCategoryId])

  const selectedManufacturer = useMemo(() => {
    const n = toNumberOrNull(manufacturerId)
    if (n == null) return null
    return manufacturersById.get(n) || null
  }, [manufacturerId, manufacturersById])

  const selectedCategoryIds = useMemo(() => uniqNumbers(categoryIds), [categoryIds])

  const priceHtNumber = useMemo(() => {
    const raw = String(priceHt || '').trim().replace(',', '.')
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [priceHt])

  const required = useMemo(() => {
    const nameOk = Boolean(normalizeSpaces(name))
    const manufacturerOk = Boolean(selectedManufacturer?.id)
    const categoriesOk = selectedCategoryIds.length >= 1
    const priceOk = priceHtNumber != null && priceHtNumber >= 0
    const shortOk = Boolean(stripHtml(shortHtml))
    const longOk = Boolean(stripHtml(longHtml))

    return {
      nameOk,
      manufacturerOk,
      categoriesOk,
      priceOk,
      shortOk,
      longOk,
      allOk: nameOk && manufacturerOk && categoriesOk && priceOk && shortOk && longOk,
    }
  }, [name, selectedManufacturer, selectedCategoryIds.length, priceHtNumber, shortHtml, longHtml])

  async function onPublish() {
    if (productId == null) return
    setPublishError('')
    setPublishResult(null)

    if (!required.allOk) {
      setPublishError('Le contrat minimum n’est pas respecté (vérifiez les champs requis).')
      return
    }

    try {
      setPublishing(true)

      const payload = {
        name: normalizeSpaces(name),
        reference: normalizeSpaces(reference) || undefined,
        manufacturer_id: selectedManufacturer?.id,
        category_ids: selectedCategoryIds,
        price_ht: priceHtNumber,
        short_html: ensureParagraphHtml(shortHtml),
        long_html: String(longHtml || ''),
        specs: (Array.isArray(specs) ? specs : [])
          .map((s) => ({ name: normalizeSpaces(s?.name), value: normalizeSpaces(s?.value) }))
          .filter((s) => s.name && s.value),
        active: Boolean(active),
      }

      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k]
      }

      const jid = await updateCatalogProduct({
        id: productId,
        draft: payload,
        imageFile,
        pdfFile,
        removePdf,
      })

      if (!jid) throw new Error('jobId manquant')
      setJobId(String(jid))
    } catch (e) {
      setPublishError(String(e?.message || e))
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Éditer produit</h1>
        <p className="text-sm text-neutral-600">Chargement…{loadProgress ? ` (${loadProgress}%)` : ''}</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Éditer produit</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
              onClick={() => setTaxReloadToken((x) => x + 1)}
            >
              Réessayer
            </button>
            <Link className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50" to="/admin/products">
              Retour liste
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Éditer produit #{productId != null ? pad6(productId) : ''}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Slug généré (info): <span className="font-mono text-xs">{draftSlug || '(vide)'}</span> (v1: le slug publié reste immuable)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50" to="/admin/products">
            Retour
          </Link>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            onClick={onPublish}
            disabled={publishing || !required.allOk}
          >
            {publishing ? 'Publication…' : 'Publier les modifications'}
          </button>
        </div>
      </div>

      {publishError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{publishError}</div>
      ) : null}

      {jobId ? (
        <PublishJobPanel
          jobId={jobId}
          onDone={(state) => {
            if (state?.status === 'success') {
              clearCatalogCache()
              setPublishResult(state?.result || { ok: true })
            }
          }}
        />
      ) : null}

      {publishResult?.slug ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="font-medium">Publication terminée.</div>
          <div className="mt-1">
            Slug: <span className="font-mono text-xs">{String(publishResult.slug)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--medilec-accent)' }}
              to={`/p/${encodeURIComponent(String(publishResult.slug))}?published=1&v=${encodeURIComponent(String(Date.now()))}`}
            >
              Voir le produit
            </Link>
            <Link className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50" to="/admin/products">
              Retour à la liste
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-medium">Nom *</div>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du produit"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Référence</div>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Référence (optionnel)"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Marque / fabricant *</div>
          <select
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {manufacturerOptions.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Prix HT (CHF) *</div>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={priceHt}
            onChange={(e) => setPriceHt(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </label>

        <div className="md:col-span-2">
          <CategoryPicker
            options={categoryOptions}
            value={selectedCategoryIds}
            onChange={setCategoryIds}
            disabled={false}
            min={1}
            max={5}
            label="Catégories"
          />
        </div>

        <label className="block">
          <div className="text-sm font-medium">Actif</div>
          <input type="checkbox" className="mt-2" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <div className="mt-1 text-xs text-neutral-600">
            Si décoché, le produit reste publiable/éditable mais n’apparaît pas dans le catalogue public (listing + recherche).
          </div>
        </label>

        <div />

        <label className="block md:col-span-2">
          <div className="text-sm font-medium">Description courte *</div>
          <textarea
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            rows={4}
            value={shortHtml}
            onChange={(e) => setShortHtml(e.target.value)}
            placeholder="Texte (ou HTML)"
          />
          <div className="mt-1 text-xs text-neutral-500">Texte brut → enveloppé automatiquement en &lt;p&gt;…&lt;/p&gt;.</div>
        </label>

        <label className="block md:col-span-2">
          <div className="text-sm font-medium">Description longue *</div>
          <textarea
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            rows={8}
            value={longHtml}
            onChange={(e) => setLongHtml(e.target.value)}
            placeholder="HTML recommandé"
          />
        </label>

        <div className="md:col-span-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Média</div>
              <div className="text-xs text-neutral-600">Image = optionnelle en update (si absente, on conserve l’existante).</div>
            </div>
          </div>

          {currentCover ? (
            <div className="mt-3 text-xs text-neutral-700">
              Image actuelle: <a className="text-blue-600 hover:underline" href={assetUrl(currentCover)} target="_blank" rel="noreferrer">{currentCover}</a>
            </div>
          ) : null}

          <label className="mt-3 block">
            <div className="text-sm font-medium">Remplacer l’image</div>
            <input className="mt-1 block w-full text-sm" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>

          <div className="mt-3">
            <div className="text-sm font-medium">PDF</div>
            {currentPdfs.length ? (
              <ul className="mt-1 list-disc pl-5 text-xs text-neutral-700">
                {currentPdfs.map((p) => (
                  <li key={p}>
                    <a className="text-blue-600 hover:underline" href={assetUrl(p)} target="_blank" rel="noreferrer">{p}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 text-xs text-neutral-600">Aucun PDF.</div>
            )}

            <label className="mt-2 block">
              <div className="text-sm">Remplacer / ajouter un PDF</div>
              <input className="mt-1 block w-full text-sm" type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </label>

            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={removePdf} onChange={(e) => setRemovePdf(e.target.checked)} />
              Supprimer le PDF existant
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Spécifications</div>
            <div className="text-xs text-neutral-600">Optionnel.</div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
            onClick={() => setSpecs((prev) => [...(Array.isArray(prev) ? prev : []), { name: '', value: '' }])}
          >
            + Ajouter
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {(Array.isArray(specs) ? specs : []).map((s, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <input
                className="md:col-span-2 rounded-lg border border-neutral-200 px-3 py-2"
                placeholder="Nom"
                value={String(s?.name || '')}
                onChange={(e) => {
                  const v = e.target.value
                  setSpecs((prev) => {
                    const next = [...(Array.isArray(prev) ? prev : [])]
                    next[idx] = { ...(next[idx] || {}), name: v }
                    return next
                  })
                }}
              />
              <input
                className="md:col-span-2 rounded-lg border border-neutral-200 px-3 py-2"
                placeholder="Valeur"
                value={String(s?.value || '')}
                onChange={(e) => {
                  const v = e.target.value
                  setSpecs((prev) => {
                    const next = [...(Array.isArray(prev) ? prev : [])]
                    next[idx] = { ...(next[idx] || {}), value: v }
                    return next
                  })
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                onClick={() => setSpecs((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []))}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
