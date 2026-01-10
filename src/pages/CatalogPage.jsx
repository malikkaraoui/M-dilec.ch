import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useCart } from '../hooks/useCart.js'
import { assetUrl, listCategories, listProductsIndex, listSearchIndex } from '../lib/catalog.js'

const SECTION_DEFS = [
  { key: 'ecg', label: 'ECG', slugs: ['ecg', 'ergospirometrie'] },
  { key: 'spiro', label: 'SPIRO', slugs: ['oxymetrie', 'spirometrie', 'options-spiro-pour'] },
  { key: 'defi', label: 'DEFI', slugs: ['defibrillateurs'] },
  { key: 'tension', label: 'TENSION', slugs: ['tension-arterielle'] },
  { key: 'diag', label: 'DIAG', slugs: ['diagnostique'] },
  { key: 'fournitures', label: 'FOURNITURES', slugs: ['fournitures'] },
  { key: 'services', label: 'SERVICES', slugs: ['service-spirometrie', 'services-ecg', 'services-tension-arterielle'] },
]

function normalizeForSearch(v) {
  // "cable" doit matcher "câble" (insensible aux accents/diacritiques)
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function CatalogPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const cart = useCart()
  const [recentlyAddedId, setRecentlyAddedId] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [productsIndex, setProductsIndex] = useState([])
  const [searchIndex, setSearchIndex] = useState([])
  const [categoriesIndex, setCategoriesIndex] = useState([])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        // Important: on ne bloque pas l'affichage des produits si le search index échoue.
        // On n'utilise pas AbortController ici: un AbortError « silencieux » peut laisser l'UI à 0.
        const pIdx = await listProductsIndex()
        if (!alive) return
        setProductsIndex(Array.isArray(pIdx) ? pIdx : [])

        const catIdx = await listCategories()
          .then((d) => d?.categories)
          .catch((e) => {
            console.warn('Categories load failed (non-bloquant):', e)
            return []
          })
        if (!alive) return
        setCategoriesIndex(Array.isArray(catIdx) ? catIdx : [])

        const sIdx = await listSearchIndex().catch((e) => {
          console.warn('Search index load failed (non-bloquant):', e)
          return []
        })
        if (!alive) return
        setSearchIndex(Array.isArray(sIdx) ? sIdx : [])
      } catch (e) {
        console.error('Catalog load failed:', e)
        if (alive) setError(String(e?.message || e))
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!recentlyAddedId) return
    const t = window.setTimeout(() => setRecentlyAddedId(''), 900)
    return () => window.clearTimeout(t)
  }, [recentlyAddedId])

  const qRaw = searchParams.get('q') || ''
  const qNormalized = qRaw.trim()
  const qNorm = normalizeForSearch(qNormalized)

  const secParam = searchParams.get('sec') || ''
  const catParam = searchParams.get('cat') || ''

  const haystackById = useMemo(() => {
    const m = new Map()
    for (const e of searchIndex) {
      const id = e?.id
      if (id == null) continue
      m.set(String(id), normalizeForSearch(e?.haystack))
    }
    return m
  }, [searchIndex])

  const products = useMemo(() => {
    // index.products.json = la “DB”. On ne charge pas les 213 fichiers ici.
    return Array.isArray(productsIndex) ? productsIndex : []
  }, [productsIndex])

  const categoryById = useMemo(() => {
    const m = new Map()
    for (const c of categoriesIndex) {
      const id = c?.id
      if (id == null) continue
      m.set(Number(id), c)
    }
    return m
  }, [categoriesIndex])

  const homeCategoryId = useMemo(() => {
    // On préfère la catégorie slug "home"; fallback = premier enfant de Root.
    const all = Array.isArray(categoriesIndex) ? categoriesIndex : []
    const home = all.find((c) => String(c?.slug || '') === 'home')
    if (home?.id != null) return Number(home.id)

    const root = all.find((c) => String(c?.slug || '') === 'root') || all.find((c) => Number(c?.id_parent) === 0)
    const childId = Array.isArray(root?.children_ids) ? root.children_ids[0] : null
    return childId != null ? Number(childId) : null
  }, [categoriesIndex])

  const sections = useMemo(() => {
    if (!homeCategoryId) return []
    const all = Array.isArray(categoriesIndex) ? categoriesIndex : []
    const homeChildren = all
      .filter((c) => Number(c?.id_parent) === Number(homeCategoryId))
      .filter((c) => c?.active !== false)

    function homeChildIdsBySlug(slug) {
      const s = String(slug || '').trim()
      if (!s) return []
      return homeChildren
        .filter((c) => String(c?.slug || '') === s)
        .map((c) => Number(c?.id))
        .filter((n) => Number.isFinite(n))
    }

    return SECTION_DEFS.map((def) => {
      const rootIds = def.slugs.flatMap((s) => homeChildIdsBySlug(s))
      // dédoublonnage
      const unique = Array.from(new Set(rootIds))
      return { ...def, rootIds: unique }
    }).filter((x) => x.rootIds.length > 0)
  }, [categoriesIndex, homeCategoryId])

  const selectedSectionKey = useMemo(() => {
    const k = String(secParam || '').trim().toLowerCase()
    if (!k) return ''
    return sections.some((s) => s.key === k) ? k : ''
  }, [secParam, sections])

  const childrenById = useMemo(() => {
    const m = new Map()
    for (const c of categoriesIndex) {
      const id = Number(c?.id)
      if (!Number.isFinite(id)) continue
      const children = Array.isArray(c?.children_ids) ? c.children_ids.map((x) => Number(x)).filter(Number.isFinite) : []
      m.set(id, children)
    }
    return m
  }, [categoriesIndex])

  const descendantsMemo = useMemo(() => {
    const memo = new Map()
    function dfs(id) {
      const n = Number(id)
      if (!Number.isFinite(n)) return new Set()
      if (memo.has(n)) return memo.get(n)
      const out = new Set([n])
      const children = childrenById.get(n) || []
      for (const child of children) {
        const sub = dfs(child)
        for (const x of sub) out.add(x)
      }
      memo.set(n, out)
      return out
    }
    return { dfs }
  }, [childrenById])

  const selectedSection = useMemo(() => sections.find((s) => s.key === selectedSectionKey) || null, [sections, selectedSectionKey])

  const selectedSectionIdSet = useMemo(() => {
    if (!selectedSection) return null
    const set = new Set()
    for (const rid of selectedSection.rootIds) {
      const sub = descendantsMemo.dfs(rid)
      for (const x of sub) set.add(x)
    }
    return set
  }, [descendantsMemo, selectedSection])

  const catPath = useMemo(() => {
    const raw = String(catParam || '').trim()
    if (!raw) return []

    const ids = raw
      .split('/')
      .map((x) => Number.parseInt(String(x).trim(), 10))
      .filter((n) => Number.isFinite(n))

    if (!ids.length || !categoryById.size) return []
    // Validation basique: tous les ids doivent exister.
    const existing = ids.filter((id) => categoryById.has(id))
    if (!existing.length) return []
    return existing
  }, [catParam, categoryById])

  const selectedCategoryIdRaw = catPath.length ? catPath[catPath.length - 1] : null
  const selectedCategoryId = useMemo(() => {
    if (!selectedCategoryIdRaw) return null
    if (!selectedSectionIdSet) return selectedCategoryIdRaw
    return selectedSectionIdSet.has(Number(selectedCategoryIdRaw)) ? selectedCategoryIdRaw : null
  }, [selectedCategoryIdRaw, selectedSectionIdSet])

  const effectivePath = useMemo(() => {
    if (!selectedCategoryId || !categoryById.size) return []
    // Reconstruit le chemin depuis Home vers la catégorie sélectionnée (robuste si URL "bizarre").
    const chain = []
    let cur = selectedCategoryId
    const guard = new Set()
    while (cur != null && !guard.has(cur)) {
      guard.add(cur)
      const c = categoryById.get(cur)
      if (!c) break
      chain.push(cur)
      const parent = c?.id_parent
      if (parent == null) break
      cur = Number(parent)
      if (homeCategoryId != null && cur === Number(homeCategoryId)) {
        chain.push(Number(homeCategoryId))
        break
      }
    }
    chain.reverse()
    // On retire Home du breadcrumb (on affiche "Catalogue" à la place).
    if (chain.length && homeCategoryId != null && chain[0] === Number(homeCategoryId)) return chain.slice(1)
    return chain
  }, [categoryById, homeCategoryId, selectedCategoryId])

  const searched = useMemo(() => {
    if (!qNorm) return products
    return products.filter((p) => {
      const id = String(p?.id ?? '')
      const h = haystackById.get(id)
      if (typeof h === 'string' && h.includes(qNorm)) return true

      // Fallback si le search index est vide/incomplet: on cherche dans des champs basiques.
      const basic = normalizeForSearch(`${p?.name || ''} ${p?.manufacturer_name || ''}`)
      return basic.includes(qNorm)
    })
  }, [products, qNorm, haystackById])

  const sectionCounts = useMemo(() => {
    // Compte de produits par section (après filtre de recherche uniquement).
    const m = new Map()
    for (const s of sections) {
      const set = new Set()
      for (const rid of s.rootIds) {
        const sub = descendantsMemo.dfs(rid)
        for (const x of sub) set.add(x)
      }
      let count = 0
      for (const p of searched) {
        const ids = Array.isArray(p?.category_ids) ? p.category_ids : []
        const ok = ids.some((id) => set.has(Number(id)))
        if (ok) count += 1
      }
      m.set(s.key, count)
    }
    return m
  }, [descendantsMemo, searched, sections])

  const baseFiltered = useMemo(() => {
    if (!selectedSectionIdSet) return searched
    return searched.filter((p) => {
      const ids = Array.isArray(p?.category_ids) ? p.category_ids : []
      return ids.some((id) => selectedSectionIdSet.has(Number(id)))
    })
  }, [searched, selectedSectionIdSet])

  const facetCounts = useMemo(() => {
    // Compte de produits par catégorie, après filtre de recherche + section.
    const m = new Map()
    for (const p of baseFiltered) {
      const ids = Array.isArray(p?.category_ids) ? p.category_ids : []
      for (const id of ids) {
        const n = Number(id)
        if (!Number.isFinite(n)) continue
        m.set(n, (m.get(n) || 0) + 1)
      }
    }
    return m
  }, [baseFiltered])

  const filtered = useMemo(() => {
    if (!selectedCategoryId) return baseFiltered
    return baseFiltered.filter((p) => {
      const ids = Array.isArray(p?.category_ids) ? p.category_ids : []
      return ids.some((id) => Number(id) === Number(selectedCategoryId))
    })
  }, [baseFiltered, selectedCategoryId])

  const duplicateMinPriceIds = useMemo(() => {
    // Objectif: si un produit existe en doublon avec des prix différents,
    // on met en rouge LA tuile qui a le prix le plus bas.
    // Critère de doublon: (name + manufacturer) normalisés.
    const groups = new Map()

    for (const p of filtered) {
      const name = normalizeForSearch(p?.name || '')
      const man = normalizeForSearch(p?.manufacturer_name || '')
      const key = `${name}|${man}`
      const id = String(p?.id ?? '')
      const price = typeof p?.price_ht === 'number' && Number.isFinite(p.price_ht) ? p.price_ht : null
      if (!id) continue
      const arr = groups.get(key) || []
      arr.push({ id, price })
      groups.set(key, arr)
    }

    const flagged = new Set()

    for (const [, items] of groups) {
      if (!Array.isArray(items) || items.length < 2) continue

      const prices = items.map((x) => x.price).filter((x) => typeof x === 'number' && Number.isFinite(x))
      if (prices.length < 2) continue

      // Prix différents ?
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) continue

      for (const it of items) {
        if (it.price === min) flagged.add(it.id)
      }
    }

    return flagged
  }, [filtered])

  const browseCategoryId = useMemo(() => {
    // Pour l'affichage de la liste de catégories: si on est sur une feuille, on affiche les "soeurs".
    if (!selectedCategoryId) return homeCategoryId
    const sel = categoryById.get(selectedCategoryId)
    const children = Array.isArray(sel?.children_ids) ? sel.children_ids : []
    if (children.length > 0) return selectedCategoryId
    const parent = sel?.id_parent
    if (parent == null) return homeCategoryId
    const pId = Number(parent)
    if (homeCategoryId != null && pId === Number(homeCategoryId)) return homeCategoryId
    return Number.isFinite(pId) ? pId : homeCategoryId
  }, [categoryById, homeCategoryId, selectedCategoryId])

  const effectiveBrowseCategoryId = useMemo(() => {
    if (!selectedSectionIdSet) return browseCategoryId
    const b = Number(browseCategoryId)
    if (!Number.isFinite(b)) return browseCategoryId
    if (selectedSectionIdSet.has(b)) return b
    // Fallback: première racine de section.
    const first = selectedSection?.rootIds?.[0]
    return Number.isFinite(Number(first)) ? Number(first) : browseCategoryId
  }, [browseCategoryId, selectedSection, selectedSectionIdSet])

  const browseCategories = useMemo(() => {
    if (!categoryById.size) return []

    // Mode "sections": pas de sec et pas de cat => on ne liste pas les catégories.
    if (!selectedSectionKey && !selectedCategoryIdRaw) return []

    // Racines de section (quand sec choisi mais pas de catégorie spécifique)
    if (selectedSection && !selectedCategoryId) {
      const roots = selectedSection.rootIds
        .map((id) => categoryById.get(Number(id)))
        .filter(Boolean)
        .filter((x) => x.active !== false)
        .map((x) => ({
          ...x,
          id: Number(x.id),
          count: facetCounts.get(Number(x.id)) || 0,
        }))
        .filter((x) => x.count > 0)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'))
      return roots
    }

    const baseId = selectedSectionIdSet ? effectiveBrowseCategoryId : browseCategoryId
    if (!baseId) return []
    const c = categoryById.get(Number(baseId))
    const ids = Array.isArray(c?.children_ids) ? c.children_ids : []
    const items = ids
      .map((id) => categoryById.get(Number(id)))
      .filter(Boolean)
      .filter((x) => x.active !== false)
      .filter((x) => (selectedSectionIdSet ? selectedSectionIdSet.has(Number(x.id)) : true))
      .map((x) => ({
        ...x,
        id: Number(x.id),
        count: facetCounts.get(Number(x.id)) || 0,
      }))
      // On n'affiche que les catégories "possibles" (au moins un produit après recherche+section).
      .filter((x) => x.count > 0)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'))

    return items
  }, [
    browseCategoryId,
    categoryById,
    effectiveBrowseCategoryId,
    facetCounts,
    selectedCategoryId,
    selectedCategoryIdRaw,
    selectedSection,
    selectedSectionIdSet,
    selectedSectionKey,
  ])

  function setParamQ(nextQ) {
    const next = new URLSearchParams(searchParams)
    const t = String(nextQ || '')
    if (!t.trim()) next.delete('q')
    else next.set('q', t)
    setSearchParams(next, { replace: true })
  }

  function setParamCatPath(nextIds, opts) {
    const next = new URLSearchParams(searchParams)
    const ids = Array.isArray(nextIds) ? nextIds : []
    const clean = ids.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    if (!clean.length) next.delete('cat')
    else next.set('cat', clean.join('/'))
    setSearchParams(next, opts)
  }

  function setParamSection(nextSectionKey, opts) {
    const next = new URLSearchParams(searchParams)
    const k = String(nextSectionKey || '').trim().toLowerCase()
    if (!k) next.delete('sec')
    else next.set('sec', k)
    // Quand on change de section, on repart propre sur les catégories.
    next.delete('cat')
    setSearchParams(next, opts)
  }

  function clearNav(opts) {
    const next = new URLSearchParams(searchParams)
    next.delete('sec')
    next.delete('cat')
    setSearchParams(next, opts)
  }

  function openCategory(id) {
    const n = Number(id)
    if (!Number.isFinite(n)) return
    // Chemin robuste depuis Home
    const chain = []
    let cur = n
    const guard = new Set()
    while (cur != null && !guard.has(cur)) {
      guard.add(cur)
      const c = categoryById.get(cur)
      if (!c) break
      chain.push(cur)
      const parent = c?.id_parent
      if (parent == null) break
      cur = Number(parent)
      if (homeCategoryId != null && cur === Number(homeCategoryId)) break
    }
    chain.reverse()
    setParamCatPath(chain, { replace: false })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Catalogue</h1>

        <input
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none focus:ring-2 sm:w-80"
          style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
          value={qRaw}
          onChange={(e) => {
            setParamQ(e.target.value)
          }}
          placeholder="Rechercher un produit…"
          type="search"
        />
      </div>

      {loading ? <p className="text-sm text-neutral-600">Chargement du catalogue…</p> : null}

      {error ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Impossible de charger le catalogue.
          <div className="mt-2 font-mono text-xs text-neutral-500">{error}</div>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="text-xs text-neutral-500">
          Index: <span className="font-medium text-neutral-700">{productsIndex.length}</span> produits,{' '}
          <span className="font-medium text-neutral-700">{searchIndex.length}</span> entrées recherche —{' '}
          <a className="underline" href="/catalog/index.products.json" target="_blank" rel="noreferrer">
            ouvrir index.products.json
          </a>{' '}
          /{' '}
          <a className="underline" href="/catalog/index.search.json" target="_blank" rel="noreferrer">
            ouvrir index.search.json
          </a>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <aside className="space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-900">
                  {selectedSectionKey || selectedCategoryIdRaw ? 'Catégories' : 'Sections'}
                </div>
                {effectivePath.length || selectedSectionKey ? (
                  <button
                    className="text-xs font-medium text-neutral-700 underline"
                    type="button"
                    onClick={() => {
                      if (effectivePath.length) {
                        const parentPath = effectivePath.slice(0, -1)
                        setParamCatPath(parentPath, { replace: false })
                        return
                      }
                      if (selectedSectionKey) {
                        setParamSection('', { replace: false })
                      }
                    }}
                  >
                    Retour
                  </button>
                ) : null}
              </div>

              <nav className="mt-2 flex flex-wrap items-center gap-1 text-xs text-neutral-600">
                <button
                  className={`rounded-md px-2 py-1 ${effectivePath.length || selectedSectionKey ? 'hover:bg-neutral-50' : 'bg-neutral-100 text-neutral-800'}`}
                  type="button"
                  onClick={() => clearNav({ replace: false })}
                >
                  Catalogue
                </button>

                {selectedSection ? (
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-400">/</span>
                    <button
                      className={`rounded-md px-2 py-1 hover:bg-neutral-50 ${!effectivePath.length && !selectedCategoryId ? 'bg-neutral-100 text-neutral-800' : ''}`}
                      type="button"
                      onClick={() => setParamCatPath([], { replace: false })}
                    >
                      {selectedSection.label}
                    </button>
                  </div>
                ) : null}

                {effectivePath.map((id, idx) => {
                  const c = categoryById.get(Number(id))
                  if (!c) return null
                  const partial = effectivePath.slice(0, idx + 1)
                  return (
                    <div key={String(id)} className="flex items-center gap-1">
                      <span className="text-neutral-400">/</span>
                      <button
                        className={`rounded-md px-2 py-1 hover:bg-neutral-50 ${idx === effectivePath.length - 1 ? 'bg-neutral-100 text-neutral-800' : ''}`}
                        type="button"
                        onClick={() => setParamCatPath(partial, { replace: false })}
                      >
                        {c.name}
                      </button>
                    </div>
                  )
                })}
              </nav>

              {!selectedSectionKey && !selectedCategoryIdRaw ? (
                <div className="mt-3">
                  <div className="grid gap-2">
                    {sections.map((s) => {
                      const count = sectionCounts.get(s.key) || 0
                      return (
                        <button
                          key={s.key}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50"
                          type="button"
                          onClick={() => setParamSection(s.key, { replace: false })}
                        >
                          <span className="font-semibold">{s.label}</span>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">Choisissez une section, puis naviguez dans les sous-catégories.</div>
                </div>
              ) : null}

              {!categoriesIndex.length ? (
                <div className="mt-3 text-xs text-neutral-500">Chargement des catégories…</div>
              ) : (selectedSectionKey || selectedCategoryIdRaw) && browseCategories.length === 0 ? (
                <div className="mt-3 text-xs text-neutral-500">Aucune sous-catégorie disponible.</div>
              ) : (selectedSectionKey || selectedCategoryIdRaw) && browseCategories.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {browseCategories.map((c) => {
                    const isActive = Number(selectedCategoryId) === Number(c.id)
                    return (
                      <li key={String(c.id)}>
                        <button
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                            isActive ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-800'
                          }`}
                          type="button"
                          onClick={() => openCategory(c.id)}
                        >
                          <span className="line-clamp-1">{c.name}</span>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{c.count}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>

            {!loading && !error ? (
              <div className="text-xs text-neutral-500">
                {qNormalized ? (
                  <>
                    Résultats pour <span className="font-medium text-neutral-700">“{qNormalized}”</span> :{' '}
                    <span className="font-medium text-neutral-700">{searched.length}</span>
                  </>
                ) : (
                  <>
                    Produits: <span className="font-medium text-neutral-700">{products.length}</span>
                  </>
                )}
                {selectedSection ? (
                  <>
                    {' '}
                    — section <span className="font-medium text-neutral-700">{selectedSection.label}</span> :{' '}
                    <span className="font-medium text-neutral-700">{baseFiltered.length}</span>
                  </>
                ) : null}
                {selectedCategoryId ? (
                  <>
                    {' '}
                    — dans <span className="font-medium text-neutral-700">{categoryById.get(Number(selectedCategoryId))?.name}</span> :{' '}
                    <span className="font-medium text-neutral-700">{filtered.length}</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div className="space-y-3">
            {!loading && !error && filtered.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Aucun résultat.</div>
            ) : null}

            {!loading && !error && filtered.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const id = p?.id
                  const slug = p?.slug
                  const name = p?.name || String(id ?? '')
                  const manufacturer = p?.manufacturer_name
                  const priceCents = typeof p?.price_ht === 'number' ? Math.round(p.price_ht * 100) : null

                  const isDuplicateMin = duplicateMinPriceIds.has(String(id ?? ''))

                  const cover = typeof p?.cover_image === 'string' && p.cover_image ? assetUrl(p.cover_image) : ''

                  const href = slug ? `/p/${slug}` : id != null ? `/product/${id}` : '/catalog'

                  return (
                    <li
                      key={String(id ?? slug ?? name)}
                      className={`group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg ${
                        isDuplicateMin
                          ? 'border-red-300 bg-red-50/40 hover:border-red-400'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(href)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(href)
                      }}
                    >
                      {isDuplicateMin ? (
                        <div className="mb-2 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          Doublon — prix le plus bas
                        </div>
                      ) : null}
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

                      <div className="mt-4 flex flex-wrap gap-2">
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
                          type="button"
                          disabled={id == null}
                          onClick={(e) => {
                            e.stopPropagation()
                            cart.add({ id: String(id ?? ''), name, brand: manufacturer, priceCents })
                            setRecentlyAddedId(String(id ?? ''))
                          }}
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
                <Link className="text-blue-600 hover:underline" to="/cart" onClick={(e) => e.stopPropagation()}>
                  Voir le panier
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* La grille produits est maintenant rendue dans la colonne de droite, avec les catégories à gauche. */}
    </section>
  )
}
