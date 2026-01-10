// Autocomplétion "best effort" pour l'Europe via Photon (Komoot).
// Pas de clé API, mais service public: on limite le nombre de requêtes et de résultats.
// https://photon.komoot.io/

const BASE = 'https://photon.komoot.io/api/'

function toStr(v) {
  return String(v || '').trim()
}

function toUpper(v) {
  return toStr(v).toUpperCase()
}

function buildLabel({ street, streetNo, postalCode, city, country }) {
  const line1 = [street, streetNo].filter(Boolean).join(' ').trim()
  const line2 = [postalCode, city].filter(Boolean).join(' ').trim()
  const cc = toUpper(country)
  const core = [line1, line2].filter(Boolean).join(' — ').trim()
  return cc ? `${core} (${cc})` : core
}

function parseFeature(feature) {
  const p = feature?.properties && typeof feature.properties === 'object' ? feature.properties : {}

  const country = toUpper(p.countrycode || '')
  const street = toStr(p.street || p.name || '')
  const streetNo = toStr(p.housenumber || '')
  const postalCode = toStr(p.postcode || '')
  const city = toStr(p.city || p.town || p.village || p.county || '')

  const label = buildLabel({ street, streetNo, postalCode, city, country })

  return {
    label,
    street,
    streetNo,
    postalCode,
    city,
    country,
  }
}

export async function searchEuAddresses({ searchText, countryCodes, limit = 6, signal }) {
  const q = toStr(searchText)
  if (!q || q.length < 3) return []

  const allowed = Array.isArray(countryCodes) ? countryCodes.map((c) => toUpper(c)).filter(Boolean) : []

  const url = new URL(BASE)
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('lang', 'fr')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Adresse: erreur ${res.status}`)
  const json = await res.json()
  const features = Array.isArray(json?.features) ? json.features : []

  return features
    .map(parseFeature)
    .filter((x) => x.label)
    .filter((x) => (allowed.length ? allowed.includes(toUpper(x.country)) : true))
}

export async function searchEuZipCities({ searchText, countryCodes, limit = 8, signal }) {
  const list = await searchEuAddresses({ searchText, countryCodes, limit, signal })

  // Dé-dupe par (postalCode, city, country)
  const seen = new Set()
  const out = []
  for (const x of list) {
    const pc = toStr(x.postalCode)
    const city = toStr(x.city)
    const cc = toUpper(x.country)
    if (!pc || !city) continue

    const key = `${pc}|${city}|${cc}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      label: `${pc} ${city}${cc ? ` (${cc})` : ''}`,
      postalCode: pc,
      city,
      country: cc,
    })
  }

  return out
}
