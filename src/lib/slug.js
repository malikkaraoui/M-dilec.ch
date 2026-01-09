// Utilitaire simple pour générer un slug URL-safe à partir d’un nom.
// Objectif: lisible, stable, et sans dépendances.

export function slugify(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'produit'

  // 1) minuscules + suppression des accents
  const noAccents = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // 2) remplace tout ce qui n’est pas [a-z0-9] par des tirets
  const dashed = noAccents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const out = dashed || 'produit'
  // garde un slug raisonnable (SEO/URL)
  return out.length > 80 ? out.slice(0, 80).replace(/-+$/g, '') : out
}
