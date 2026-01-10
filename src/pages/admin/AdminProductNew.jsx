import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CategoryPicker } from '../../components/admin/CategoryPicker.jsx'
import { PublishJobPanel } from '../../components/admin/PublishJobPanel.jsx'
import { createCatalogProduct } from '../../lib/catalogPublisher.js'
import { clearCatalogCache, listCategories, listManufacturers } from '../../lib/catalog.js'
import { slugify } from '../../lib/slug.js'

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

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

export function AdminProductNewPage() {
  const [taxStatus, setTaxStatus] = useState('loading')
  const [taxProgress, setTaxProgress] = useState(0)
  const [taxError, setTaxError] = useState('')
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

  const [specs] = useState(() => [])

  const [imageFile, setImageFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)

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
      setTaxError('')
      setTaxStatus('loading')
      setTaxProgress(0)

      try {
        const cats = await listCategories({ signal: ctrl.signal })
        if (cancelled) return
        setTaxProgress(50)

        const mans = await listManufacturers({ signal: ctrl.signal })
        if (cancelled) return
        setTaxProgress(100)

        const catsArr = Array.isArray(cats?.categories) ? cats.categories : []
        const mansArr = Array.isArray(mans?.manufacturers) ? mans.manufacturers : []

        if (!cancelled) {
          setCategories(catsArr)
          setManufacturers(mansArr)
          setTaxStatus('success')
        }
      } catch (err) {
        if (cancelled) return
        setTaxStatus('error')
        setTaxError(timedOut ? 'Timeout: impossible de charger les taxonomies (vérifiez que Vite sert bien /catalog/*).' : String(err?.message || err))
        setCategories([])
        setManufacturers([])
      } finally {
        window.clearTimeout(timeout)
      }
    }

    run()

    return () => {
      cancelled = true
      ctrl.abort()
      window.clearTimeout(timeout)
    }
  }, [taxReloadToken])

  const manufacturersById = useMemo(() => {
    const m = new Map()
    for (const x of Array.isArray(manufacturers) ? manufacturers : []) {
      const id = x?.id
      if (id == null) continue
      const n = Number(id)
      const nm = String(x?.name || '').trim()
      if (!Number.isFinite(n) || !nm) continue
      m.set(n, { id: n, name: nm })
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
      const id = c?.id
      if (id == null) continue
      const n = Number(id)
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
      const id = Number(cat?.id)
      if (!Number.isFinite(id)) return ''
      if (cache.has(id)) return cache.get(id)

      const names = []
      let cur = cat
      let guard = 0
      while (cur && guard < 30) {
        const nm = String(cur?.name || '').trim()
        if (nm) names.push(nm)

        const pid = Number(cur?.id_parent)
        if (!Number.isFinite(pid) || pid <= 0) break
        if (homeCategoryId != null && pid === homeCategoryId) break

        cur = categoriesById.get(pid)
        guard += 1
      }

      const out = names.reverse().join(' › ')
      cache.set(id, out)
      return out
    }

    const out = all
      .filter((c) => {
        if (!c || typeof c !== 'object') return false
        if (c.active === false) return false
        const slug = String(c.slug || '').trim()
        if (!slug || slug === 'root' || slug === 'home') return false
        return true
      })
      .map((c) => {
        const id = Number(c?.id)
        if (!Number.isFinite(id)) return null
        const label = labelFor(c) || String(c?.name || id)
        return { id, label }
      })
      .filter(Boolean)

    out.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    return out
  }, [categories, categoriesById, homeCategoryId])

  const selectedManufacturer = useMemo(() => {
    const id = toNumberOrNull(manufacturerId)
    if (id == null) return null
    return manufacturersById.get(id) || null
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
    const imageOk = Boolean(imageFile && imageFile.name)

    return {
      nameOk,
      manufacturerOk,
      categoriesOk,
      priceOk,
      shortOk,
      longOk,
      imageOk,
      allOk: nameOk && manufacturerOk && categoriesOk && priceOk && shortOk && longOk && imageOk,
    }
  }, [name, selectedManufacturer, selectedCategoryIds.length, priceHtNumber, shortHtml, longHtml, imageFile])

  async function onPublish() {
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
          .map((s) => ({
            name: normalizeSpaces(s?.name),
            value: normalizeSpaces(s?.value),
          }))
          .filter((s) => s.name && s.value),
        active: Boolean(active),
      }

      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k]
      }

      const jid = await createCatalogProduct({
        draft: payload,
        imageFile,
        pdfFile,
      })

      if (!jid) throw new Error('jobId manquant')
      setJobId(String(jid))
    } catch (e) {
      setPublishError(String(e?.message || e))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau produit (localhost)</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Publie directement dans <span className="font-mono text-xs">public/catalog</span> via le publisher local.
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
            {publishing ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </div>

      {taxStatus === 'loading' ? (
        <p className="text-sm text-neutral-600">
          Chargement des taxonomies…{taxProgress ? ` (${taxProgress}%)` : ''}
        </p>
      ) : null}

      {taxStatus === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger les taxonomies depuis <span className="font-mono text-xs">/catalog/taxonomies</span>.
          <div className="mt-2 font-mono text-xs text-red-700">{taxError}</div>
          <div className="mt-3">
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
              onClick={() => setTaxReloadToken((x) => x + 1)}
            >
              Réessayer
            </button>
          </div>
        </div>
      ) : null}

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
          <div className="mt-1 text-xs text-neutral-500">
            Slug: <span className="font-mono">{draftSlug}</span>
          </div>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Référence</div>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optionnel"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Fabricant *</div>
          <select
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            disabled={taxStatus !== 'success'}
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
            placeholder="Ex: 199.90"
            inputMode="decimal"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Actif</div>
          <input type="checkbox" className="mt-2" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <div className="mt-1 text-xs text-neutral-600">
            Si décoché, le produit est publié mais masqué du catalogue public (listing + recherche).
          </div>
        </label>
        <div />

        <div className="md:col-span-2">
          <CategoryPicker
            options={categoryOptions}
            value={selectedCategoryIds}
            onChange={setCategoryIds}
            disabled={taxStatus !== 'success'}
            min={1}
            max={5}
            label="Catégories"
          />
        </div>

        <label className="block md:col-span-2">
          <div className="text-sm font-medium">Description courte *</div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
              onClick={() => setShortHtml((v) => ensureParagraphHtml(v))}
            >
              Wrap &lt;p&gt;
            </button>
          </div>
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2"
            rows={4}
            value={shortHtml}
            onChange={(e) => setShortHtml(e.target.value)}
          />
        </label>

        <label className="block md:col-span-2">
          <div className="text-sm font-medium">Description longue *</div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
              onClick={() => setLongHtml((v) => ensureParagraphHtml(v))}
            >
              Wrap &lt;p&gt;
            </button>
          </div>
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2"
            rows={8}
            value={longHtml}
            onChange={(e) => setLongHtml(e.target.value)}
          />
        </label>

        <div className="md:col-span-2 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Fichiers *</div>
              <div className="text-xs text-neutral-600">V1: 1 image “grande” obligatoire. PDF optionnel.</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium">Image *</div>
              <input className="mt-1 block w-full text-sm" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <label className="block">
              <div className="text-sm font-medium">PDF (optionnel)</div>
              <input className="mt-1 block w-full text-sm" type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
