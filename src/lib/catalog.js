// Base publique: les exports sont servis depuis /public/catalog
export const BASE = '/catalog'

// Compat: ancien nom utilisé dans quelques fichiers.
export const CATALOG_BASE = BASE

/**
 * Retourne un identifiant numérique sur 6 chiffres.
 * Ex: 28 -> "000028"
 */
export function pad6(id) {
  const raw = id == null ? '' : String(id).trim()
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN

  if (!Number.isFinite(n)) {
    // Fallback permissif: on pad la chaîne telle quelle (utile si l'id est déjà "000028").
    return raw.padStart(6, '0')
  }

  return String(n).padStart(6, '0')
}

/**
 * Construit une URL d’asset relative au catalogue exporté.
 * Ex: "assets/products/.../img.jpg" -> "/catalog/assets/products/.../img.jpg"
 */
export function assetUrl(rel) {
  const clean = rel == null ? '' : String(rel).replace(/^\/+/, '')
  return `${BASE}/${clean}`
}

/**
 * Fetch JSON avec gestion d’erreurs (HTTP + parse JSON).
 */
export async function fetchJSON(path, options = {}) {
  const { signal } = options

  const url = String(path).startsWith('http')
    ? String(path)
    : String(path).startsWith('/')
      ? String(path)
      : `${BASE}/${String(path).replace(/^\/+/, '')}`

  const res = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    let details = ''
    try {
      details = (await res.text()) || ''
    } catch {
      // ignore
    }

    const e = new Error(
      `Impossible de charger ${url} (HTTP ${res.status} ${res.statusText})${details ? `\n${details.slice(0, 240)}` : ''}`,
    )
    e.status = res.status
    e.url = url
    throw e
  }

  try {
    return await res.json()
  } catch (err) {
    const e = new Error(`Réponse JSON invalide pour ${url}: ${String(err?.message || err)}`)
    e.url = url
    throw e
  }
}

let _productsIndexPromise = null
let _searchIndexPromise = null
let _catalogPromise = null
let _categoriesPromise = null
let _manufacturersPromise = null

/**
 * Invalide les caches mémoire (utile après un publish en localhost).
 */
export function clearCatalogCache() {
  _productsIndexPromise = null
  _searchIndexPromise = null
  _catalogPromise = null
  _categoriesPromise = null
  _manufacturersPromise = null
}

export async function getCatalog(options) {
  if (!_catalogPromise) {
    _catalogPromise = fetchJSON(`${BASE}/catalog.json`, options)
  }
  try {
    return await _catalogPromise
  } catch (err) {
    _catalogPromise = null
    throw err
  }
}

export async function listProductsIndex(options) {
  const cacheBust = options && typeof options === 'object' ? options.cacheBust : null
  const url = cacheBust
    ? `${BASE}/index.products.json?v=${encodeURIComponent(String(cacheBust))}`
    : `${BASE}/index.products.json`

  // Si cacheBust est présent, on bypass le cache (sinon on reste sur le comportement existant).
  let data
  if (cacheBust) {
    data = await fetchJSON(url, options)
  } else {
    if (!_productsIndexPromise) {
      _productsIndexPromise = fetchJSON(url, options)
    }
    try {
      data = await _productsIndexPromise
    } catch (err) {
      // Permet de retenter après un abort/réseau KO.
      _productsIndexPromise = null
      throw err
    }
  }
  if (!Array.isArray(data)) {
    throw new Error('index.products.json: format inattendu (tableau attendu)')
  }
  return data
}

export async function listSearchIndex(options) {
  const cacheBust = options && typeof options === 'object' ? options.cacheBust : null
  const url = cacheBust
    ? `${BASE}/index.search.json?v=${encodeURIComponent(String(cacheBust))}`
    : `${BASE}/index.search.json`

  let data
  if (cacheBust) {
    data = await fetchJSON(url, options)
  } else {
    if (!_searchIndexPromise) {
      _searchIndexPromise = fetchJSON(url, options)
    }
    try {
      data = await _searchIndexPromise
    } catch (err) {
      _searchIndexPromise = null
      throw err
    }
  }
  if (!Array.isArray(data)) {
    throw new Error('index.search.json: format inattendu (tableau attendu)')
  }
  return data
}

export async function listCategories(options) {
  if (!_categoriesPromise) {
    _categoriesPromise = fetchJSON(`${BASE}/taxonomies/categories.json`, options)
  }
  try {
    return await _categoriesPromise
  } catch (err) {
    _categoriesPromise = null
    throw err
  }
}

export async function listManufacturers(options) {
  if (!_manufacturersPromise) {
    _manufacturersPromise = fetchJSON(`${BASE}/taxonomies/manufacturers.json`, options)
  }
  try {
    return await _manufacturersPromise
  } catch (err) {
    _manufacturersPromise = null
    throw err
  }
}

export async function getProductById(id, options) {
  const cacheBust = options && typeof options === 'object' ? options.cacheBust : null
  const url = cacheBust
    ? `${BASE}/products/${pad6(id)}.json?v=${encodeURIComponent(String(cacheBust))}`
    : `${BASE}/products/${pad6(id)}.json`
  return await fetchJSON(url, options)
}

export async function findProductIdBySlug(slug, options) {
  const s = slug == null ? '' : String(slug).trim()
  if (!s) return null

  const idx = await listProductsIndex(options)
  const found = idx.find((p) => String(p?.slug || '') === s)
  return found?.id ?? null
}
