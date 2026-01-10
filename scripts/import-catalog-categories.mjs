#!/usr/bin/env node

/**
 * Import des catégories (export catalogue) vers Firebase Realtime Database (/taxonomies/categories).
 *
 * Objectif: rendre les catégories disponibles côté Admin même si l’asset public n’est pas accessible.
 *
 * - Écrit le contenu JSON tel quel sous /taxonomies/categories
 * - Option: --dry-run pour afficher un résumé sans écrire
 * - Option: --file pour pointer un autre fichier
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
    dryRun: false,
    help: false,
    file: 'public/catalog/taxonomies/categories.json',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]

    switch (a) {
      case '--dry-run':
        out.dryRun = true
        break
      case '--help':
      case '-h':
        out.help = true
        break
      case '--file': {
        const raw = argv[i + 1]
        i += 1
        if (raw) out.file = String(raw)
        break
      }
      default:
        // ignore (fail-soft)
        break
    }
  }

  return out
}

function usage() {
  const cmd = path.basename(process.argv[1] || 'node')
  return [
    'Import catalogue -> Firebase RTDB (/taxonomies/categories)',
    '',
    'Prérequis:',
    '  - GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json',
    '  - VITE_FIREBASE_DATABASE_URL=...  (ou FIREBASE_DATABASE_URL)',
    '',
    'Usage:',
    `  node scripts/${cmd} [--dry-run] [--file public/catalog/taxonomies/categories.json]`,
    '',
    'Options:',
    '  --dry-run     Affiche un résumé sans écrire dans RTDB',
    '  --file PATH   Chemin du fichier categories.json (défaut: public/catalog/taxonomies/categories.json)',
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

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }

  const { databaseURL } = requireEnv()

  const payload = readJsonFile(args.file)
  const cats = Array.isArray(payload?.categories) ? payload.categories : null
  if (!cats) {
    throw new Error(`Fichier invalide: ${args.file} (attendu: { categories: [...] }).`)
  }

  process.stdout.write(
    [
      `Taxonomie: ${args.file}`,
      `Catégories: ${cats.length}`,
      'RTDB: /taxonomies/categories',
      args.dryRun ? 'DRY RUN: aucune écriture' : null,
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  if (args.dryRun) return

  initializeApp({
    credential: applicationDefault(),
    databaseURL,
  })

  const db = getDatabase()
  await db.ref('taxonomies/categories').set(payload)

  process.stdout.write('OK: import terminé.\n')
}

main().catch((err) => {
  process.stderr.write(`Erreur: ${String(err?.message || err)}\n`)
  process.exitCode = 1
})
