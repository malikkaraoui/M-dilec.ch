#!/usr/bin/env node

/**
 * Import des taxonomies (export catalogue) vers Firebase Realtime Database.
 *
 * Écrit:
 * - /taxonomies/categories      depuis public/catalog/taxonomies/categories.json
 * - /taxonomies/manufacturers   depuis public/catalog/taxonomies/manufacturers.json
 *
 * Options:
 * - --dry-run     affiche un résumé sans écrire
 * - --only cats|manufacturers   importe seulement une taxonomie
 * - --optional    si les variables d’env sont manquantes, affiche un warning et exit 0
 *
 * Prérequis (local/CI):
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
    optional: false,
    only: '',
    categoriesFile: 'public/catalog/taxonomies/categories.json',
    manufacturersFile: 'public/catalog/taxonomies/manufacturers.json',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]

    switch (a) {
      case '--dry-run':
        out.dryRun = true
        break
      case '--optional':
        out.optional = true
        break
      case '--help':
      case '-h':
        out.help = true
        break
      case '--only': {
        const raw = argv[i + 1]
        i += 1
        out.only = String(raw || '').trim()
        break
      }
      case '--categories-file': {
        const raw = argv[i + 1]
        i += 1
        if (raw) out.categoriesFile = String(raw)
        break
      }
      case '--manufacturers-file': {
        const raw = argv[i + 1]
        i += 1
        if (raw) out.manufacturersFile = String(raw)
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
    'Import catalogue -> Firebase RTDB (/taxonomies/*)',
    '',
    'Prérequis:',
    '  - GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json',
    '  - VITE_FIREBASE_DATABASE_URL=...  (ou FIREBASE_DATABASE_URL)',
    '',
    'Usage:',
    `  node scripts/${cmd} [--dry-run] [--only cats|manufacturers] [--optional]`,
    '',
    'Options:',
    '  --dry-run                 Affiche un résumé sans écrire dans RTDB',
    '  --only cats|manufacturers Importe seulement une taxonomie',
    '  --optional                Si env manquante: warning + exit 0 (utile en predeploy)',
    '  --categories-file PATH    Chemin categories.json',
    '  --manufacturers-file PATH Chemin manufacturers.json',
    '',
  ].join('\n')
}

function readJsonFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return JSON.parse(raw)
}

function requireEnv({ optional }) {
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const dbUrl = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL

  if (!gac || !String(gac).trim() || !dbUrl || !String(dbUrl).trim()) {
    const msg =
      'Import taxonomies: env manquante. Attendu GOOGLE_APPLICATION_CREDENTIALS et FIREBASE_DATABASE_URL/VITE_FIREBASE_DATABASE_URL.'
    if (optional) {
      process.stdout.write(`${msg} (optional: skip)\n`)
      return null
    }
    throw new Error(msg)
  }

  return { databaseURL: String(dbUrl).trim() }
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }

  const env = requireEnv({ optional: args.optional })
  if (!env) return

  const only = normalizeOnly(args.only)

  const payloads = []
  if (!only || only === 'cats') {
    const catsPayload = readJsonFile(args.categoriesFile)
    const cats = Array.isArray(catsPayload?.categories) ? catsPayload.categories : null
    if (!cats) throw new Error(`Fichier invalide: ${args.categoriesFile} (attendu: { categories: [...] }).`)
    payloads.push({ key: 'categories', path: 'taxonomies/categories', count: cats.length, payload: catsPayload })
  }

  if (!only || only === 'manufacturers') {
    const mPayload = readJsonFile(args.manufacturersFile)
    const list = Array.isArray(mPayload?.manufacturers) ? mPayload.manufacturers : null
    if (!list) throw new Error(`Fichier invalide: ${args.manufacturersFile} (attendu: { manufacturers: [...] }).`)
    payloads.push({
      key: 'manufacturers',
      path: 'taxonomies/manufacturers',
      count: list.length,
      payload: mPayload,
    })
  }

  if (!payloads.length) {
    process.stdout.write('Rien à importer (option --only invalide ?).\n')
    return
  }

  process.stdout.write(
    [
      'Import taxonomies -> RTDB',
      `Mode: ${args.dryRun ? 'dry-run' : 'write'}`,
      ...payloads.map((p) => `- ${p.key}: ${p.count} -> /${p.path}`),
      '',
    ].join('\n'),
  )

  if (args.dryRun) return

  initializeApp({
    credential: applicationDefault(),
    databaseURL: env.databaseURL,
  })

  const db = getDatabase()
  for (const p of payloads) {
    await db.ref(p.path).set(p.payload)
  }

  process.stdout.write('OK: import terminé.\n')
}

function normalizeOnly(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'cats' || v === 'categories' || v === 'category') return 'cats'
  if (v === 'manufacturers' || v === 'manufacturer' || v === 'brands') return 'manufacturers'
  return ''
}

main().catch((err) => {
  process.stderr.write(`Erreur: ${String(err?.message || err)}\n`)
  process.exitCode = 1
})
