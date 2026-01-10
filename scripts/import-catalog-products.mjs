#!/usr/bin/env node

/**
 * Import des produits (export catalogue) vers Firebase Realtime Database (/products).
 *
 * Objectif: alimenter /products avec des produits "réels" basés sur `public/catalog/index.products.json`.
 *
 * - Clé RTDB = id du catalogue (ex: "123")
 * - Par défaut: ajoute uniquement les produits manquants (ne modifie pas l’existant)
 * - Option: --overwrite pour écraser/mettre à jour les entrées existantes
 * - Option: --dry-run pour afficher un résumé sans écrire
 *
 * Prérequis (local):
 * - GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json (Admin SDK)
 * - VITE_FIREBASE_DATABASE_URL=... (ou FIREBASE_DATABASE_URL)
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

function parseArgs(argv) {
  const out = {
    overwrite: false,
    dryRun: false,
    limit: null,
    help: false,
    file: 'public/catalog/index.products.json',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]

    switch (a) {
      case '--overwrite':
        out.overwrite = true
        break
      case '--dry-run':
        out.dryRun = true
        break
      case '--help':
      case '-h':
        out.help = true
        break
      case '--limit': {
        const raw = argv[i + 1]
        i += 1
        const n = Number.parseInt(String(raw || ''), 10)
        out.limit = Number.isFinite(n) && n > 0 ? n : null
        break
      }
      case '--file': {
        const raw = argv[i + 1]
        i += 1
        if (raw) out.file = String(raw)
        break
      }
      default:
        // ignore arguments inconnus (fail-soft)
        break
    }
  }

  return out
}

function usage() {
  const cmd = path.basename(process.argv[1] || 'node')
  return [
    'Import catalogue -> Firebase RTDB (/products)',
    '',
    'Prérequis:',
    '  - GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json',
    '  - VITE_FIREBASE_DATABASE_URL=...  (ou FIREBASE_DATABASE_URL)',
    '',
    'Usage:',
    `  node scripts/${cmd} [--dry-run] [--overwrite] [--limit 100] [--file public/catalog/index.products.json]`,
    '',
    'Options:',
    '  --dry-run     Affiche un résumé sans écrire dans RTDB',
    '  --overwrite   Met à jour/écrase les produits existants (sinon: ajoute seulement les manquants)',
    '  --limit N     Traite au plus N produits (utile pour tester)',
    '  --file PATH   Chemin du fichier index.products.json (défaut: public/catalog/index.products.json)',
    '',
  ].join('\n')
}

function requireEnv() {
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!gac || !String(gac).trim()) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS manquant. Télécharge un Service Account JSON et exporte GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/le.json',
    )
  }

  const dbUrl = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL
  if (!dbUrl || !String(dbUrl).trim()) {
    throw new Error(
      'Database URL manquante. Renseigne FIREBASE_DATABASE_URL ou VITE_FIREBASE_DATABASE_URL (ex: https://<project>.europe-west1.firebasedatabase.app).',
    )
  }

  return { databaseURL: String(dbUrl).trim() }
}

function readJsonFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return JSON.parse(raw)
}

function toPriceCents(priceHt) {
  if (priceHt == null || priceHt === '') return null
  const n = typeof priceHt === 'number' ? priceHt : Number(priceHt)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

function chunkEntries(entries, chunkSize) {
  const out = []
  for (let i = 0; i < entries.length; i += chunkSize) {
    out.push(entries.slice(i, i + chunkSize))
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }

  const { databaseURL } = requireEnv()

  const index = readJsonFile(args.file)
  if (!Array.isArray(index)) {
    throw new Error(`Fichier invalide: ${args.file} (attendu: JSON array).`)
  }

  const allProducts = args.limit ? index.slice(0, args.limit) : index

  initializeApp({
    credential: applicationDefault(),
    databaseURL,
  })

  const db = getDatabase()
  const productsRef = db.ref('products')
  const snap = await productsRef.get()
  const existing = snap.exists() && snap.val() && typeof snap.val() === 'object' ? snap.val() : {}

  const existingKeys = new Set(Object.keys(existing || {}))

  let considered = 0
  let willWrite = 0
  let skippedInvalid = 0
  let skippedExisting = 0

  const now = Date.now()

  const entries = []
  for (const p of allProducts) {
    considered += 1

    const rawId = p?.id
    const id = rawId == null ? '' : String(rawId).trim()
    if (!id) {
      skippedInvalid += 1
      continue
    }

    const already = existingKeys.has(id)
    if (already && !args.overwrite) {
      skippedExisting += 1
      continue
    }

    const name = typeof p?.name === 'string' ? p.name.trim() : ''
    const slug = typeof p?.slug === 'string' ? p.slug.trim() : ''
    const brand = typeof p?.manufacturer_name === 'string' ? p.manufacturer_name.trim() : ''

    const payload = {
      name: name || id,
      slug: slug || null,
      brand: brand || null,
      // MVP: on reprend le prix HT comme base (peut rester null)
      priceCents: toPriceCents(p?.price_ht),
      active: p?.active === false ? false : true,

      // Métadonnées utiles pour debug/évolutions
      source: {
        type: 'catalog',
        catalogId: id,
        importedAt: now,
      },
      catalog: {
        id,
        coverImage: typeof p?.cover_image === 'string' ? p.cover_image : null,
        categoryIds: Array.isArray(p?.category_ids) ? p.category_ids : null,
        price_ht: typeof p?.price_ht === 'number' ? p.price_ht : null,
        manufacturer_name: brand || null,
      },
    }

    // Si on écrase, on préserve quand même certains champs admin (PDF/image) si présents.
    if (already && args.overwrite) {
      const prev = existing?.[id]
      if (prev && typeof prev === 'object') {
        if (prev.pdf != null) payload.pdf = prev.pdf
        if (prev.image != null) payload.image = prev.image
        if (prev.description != null) payload.description = prev.description
      }
    }

    entries.push([id, payload])
  }

  willWrite = entries.length

  const modeLabel = args.overwrite ? 'overwrite' : 'missing-only'
  process.stdout.write(
    [
      `Catalogue: ${args.file}`,
      `Produits index: ${index.length}`,
      args.limit ? `Limite: ${args.limit}` : null,
      `RTDB: /products (existing=${existingKeys.size})`,
      `Mode: ${modeLabel}`,
      `Considérés: ${considered}`,
      `À écrire: ${willWrite}`,
      skippedExisting ? `Ignorés (déjà existants): ${skippedExisting}` : null,
      skippedInvalid ? `Ignorés (id invalide): ${skippedInvalid}` : null,
      args.dryRun ? 'DRY RUN: aucune écriture' : null,
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  if (args.dryRun || willWrite === 0) return

  // Update RTDB: on chunk pour éviter des payloads trop gros.
  const chunks = chunkEntries(entries, 400)
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    const payload = Object.fromEntries(chunk)

    await productsRef.update(payload)
    process.stdout.write(`Chunk ${i + 1}/${chunks.length}: ${chunk.length} produit(s) écrit(s)\n`)
  }

  process.stdout.write('OK: import terminé.\n')
}

main().catch((err) => {
  process.stderr.write(`Erreur: ${String(err?.message || err)}\n`)
  process.stderr.write('---\n')
  process.stderr.write(`${usage()}\n`)
  process.exit(1)
})
