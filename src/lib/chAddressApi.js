// API Swiss address helper (geo.admin.ch)
// Objectif: autocomplétion simple et validation CP/Ville sans dépendances.

const BASE = 'https://api3.geo.admin.ch/rest/services/api/SearchServer'

function toStr(v) {
  return String(v || '').trim()
}

function stripHtml(value) {
  return toStr(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function parseLabelToParts(label) {
  const clean = stripHtml(label)
  // Ex: "Rue des Pitons 2 1205 Genève"
  // On reste volontairement permissif sur le numéro (2, 2A, 2-4, etc.)
  const m = clean.match(/^(.*?)\s+([0-9A-Za-z\-/]+)\s+(\d{4})\s+(.+)$/)
  if (!m) return null
  return {
    street: toStr(m[1]),
    streetNo: toStr(m[2]),
    postalCode: toStr(m[3]),
    city: toStr(m[4]),
  }
}

export async function searchChAddresses({ searchText, limit = 6, signal }) {
  const q = toStr(searchText)
  if (!q || q.length < 3) return []

  const url = new URL(BASE)
  url.searchParams.set('type', 'locations')
  url.searchParams.set('searchText', q)
  // Origine "address" pour prioriser les adresses postales
  url.searchParams.set('origins', 'address')
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Adresse: erreur ${res.status}`)
  const json = await res.json()

  const results = Array.isArray(json?.results) ? json.results : []

  return results
    .map((r) => {
      const attrs = r?.attrs && typeof r.attrs === 'object' ? r.attrs : {}

      // geo.admin renvoie souvent `label` avec du HTML (<b>) et, pour origin=address,
      // le numéro est dans `num`.
      const rawLabel = attrs.label || r?.label
      const label = stripHtml(rawLabel)

      const parsed = parseLabelToParts(rawLabel) || parseLabelToParts(attrs.detail || '')

      const street = toStr(parsed?.street || '')
      const streetNo = toStr(parsed?.streetNo || attrs.num || '')
      const postalCode = toStr(parsed?.postalCode || '')
      const city = toStr(parsed?.city || '')

      return {
        label,
        street,
        streetNo,
        postalCode,
        city,
        country: 'CH',
      }
    })
    .filter((x) => x.label)
}

export async function validateChPostalCity({ postalCode, city, signal }) {
  const zip = toStr(postalCode)
  const c = toStr(city)

  // Validation uniquement si les 2 sont présents
  if (!zip || !c) return { ok: true, reason: 'missing' }
  if (!/^\d{4}$/.test(zip)) return { ok: false, reason: 'zip-format' }

  const url = new URL(BASE)
  url.searchParams.set('type', 'locations')
  url.searchParams.set('searchText', `${zip} ${c}`)
  url.searchParams.set('origins', 'zipcode')
  url.searchParams.set('limit', '10')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) return { ok: true, reason: 'network' } // fail-soft
  const json = await res.json()
  const results = Array.isArray(json?.results) ? json.results : []

  const cLower = c.toLowerCase()

  const match = results.some((r) => {
    const attrs = r?.attrs && typeof r.attrs === 'object' ? r.attrs : {}
    const rZip = toStr(attrs.zip || attrs.plz4 || '')
    const rCity = toStr(attrs.municipality || attrs.ortbez27 || attrs.city || '')
    return rZip === zip && rCity.toLowerCase() === cLower
  })

  return match ? { ok: true } : { ok: false, reason: 'mismatch' }
}

export async function searchChZipCities({ searchText, limit = 8, signal }) {
  const q = toStr(searchText)
  if (!q || q.length < 2) return []

  const url = new URL(BASE)
  url.searchParams.set('type', 'locations')
  url.searchParams.set('searchText', q)
  url.searchParams.set('origins', 'zipcode')
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Adresse: erreur ${res.status}`)
  const json = await res.json()
  const results = Array.isArray(json?.results) ? json.results : []

  const seen = new Set()
  const out = []
  for (const r of results) {
    const attrs = r?.attrs && typeof r.attrs === 'object' ? r.attrs : {}
    const postalCode = toStr(attrs.zip || attrs.plz4 || '')
    const city = toStr(attrs.municipality || attrs.ortbez27 || attrs.city || '')
    if (!postalCode || !city) continue

    const key = `${postalCode}|${city}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      label: `${postalCode} ${city} (CH)`,
      postalCode,
      city,
      country: 'CH',
    })
  }

  return out
}
