function isLocalhost() {
  if (typeof window === 'undefined') return false
  const h = window.location?.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '::1'
}

function getAdminTokenOrThrow() {
  const token = import.meta.env?.VITE_ADMIN_TOKEN

  // DX: en local/dev on autorise un fallback (aligné avec .env.example) pour éviter de bloquer
  // l’admin si la variable n’a pas encore été posée.
  if (isLocalhost() && import.meta.env?.DEV && !token) {
    return 'dev-token'
  }

  if (!token) {
    throw new Error('VITE_ADMIN_TOKEN manquant (définissez-le dans .env.local — doit correspondre à ADMIN_TOKEN côté publisher)')
  }

  return String(token)
}

async function apiFetch(path, options = {}) {
  const url = String(path).startsWith('/') ? String(path) : `/${String(path)}`

  const headers = new Headers(options.headers || {})

  // Contrat: on n’envoie le token que sur localhost.
  if (isLocalhost()) {
    headers.set('X-ADMIN-TOKEN', getAdminTokenOrThrow())
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let details = ''
    try {
      details = await res.text()
    } catch {
      // ignore
    }
    throw new Error(
      `Erreur API ${res.status} ${res.statusText} sur ${url}${details ? `\n${details.slice(0, 400)}` : ''}`,
    )
  }

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return await res.json()
  return await res.text()
}

export async function pingPublisher() {
  return await apiFetch('/api/catalog/ping')
}

export async function createCatalogProduct({ draft, imageFile, pdfFile }) {
  if (!isLocalhost()) {
    throw new Error('Publish disponible uniquement en localhost')
  }
  const fd = new FormData()
  fd.set('payload', JSON.stringify(draft))
  fd.set('image', imageFile)
  if (pdfFile) fd.set('pdf', pdfFile)

  const out = await apiFetch('/api/catalog/products', { method: 'POST', body: fd })
  return out?.jobId
}

export async function updateCatalogProduct({ id, draft, imageFile, pdfFile, removePdf }) {
  if (!isLocalhost()) {
    throw new Error('Publish disponible uniquement en localhost')
  }
  const fd = new FormData()
  fd.set('payload', JSON.stringify(draft))
  if (imageFile) fd.set('image', imageFile)
  if (pdfFile) fd.set('pdf', pdfFile)
  if (removePdf) fd.set('remove_pdf', 'true')

  const out = await apiFetch(`/api/catalog/products/${encodeURIComponent(String(id))}`, { method: 'PUT', body: fd })
  return out?.jobId
}

export async function deleteCatalogProduct({ id }) {
  if (!isLocalhost()) {
    throw new Error('Publish disponible uniquement en localhost')
  }
  const out = await apiFetch(`/api/catalog/products/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
  return out?.jobId
}

export async function getCatalogJob(jobId) {
  return await apiFetch(`/api/catalog/jobs/${encodeURIComponent(String(jobId))}`)
}

export async function getCatalogJobLog(jobId) {
  return await apiFetch(`/api/catalog/jobs/${encodeURIComponent(String(jobId))}/log`)
}
