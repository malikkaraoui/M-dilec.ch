#!/usr/bin/env node

/**
 * Bootstrap du compte admin (Firebase Auth) + custom claims.
 *
 * Objectif: un admin "connu d’avance" (ex: admin@medilec.ch) qui se connecte via email/password,
 * et possède tous les droits côté app via le claim: { role: "admin" }.
 *
 * Prérequis:
 * - Avoir un Service Account Firebase (Admin SDK)
 * - Exporter GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json
 *
 * Usage:
 *   node scripts/set-admin-role.mjs --email admin@medilec.ch --role admin --create --password "..."
 */

import crypto from 'node:crypto'

import { initializeApp } from 'firebase-admin/app'
import { applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function parseArgs(argv) {
  const out = {
    email: '',
    role: 'admin',
    create: false,
    password: '',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]

    if (a === '--email') {
      out.email = String(argv[i + 1] || '')
      i += 1
      continue
    }

    if (a === '--role') {
      out.role = String(argv[i + 1] || '')
      i += 1
      continue
    }

    if (a === '--password') {
      out.password = String(argv[i + 1] || '')
      i += 1
      continue
    }

    if (a === '--create') {
      out.create = true
      continue
    }

    if (a === '--help' || a === '-h') {
      out.help = true
      continue
    }
  }

  return out
}

function usage() {
  return [
    'Bootstrap admin (Firebase Auth + custom claims)',
    '',
    'Prérequis:',
    '  - Définir GOOGLE_APPLICATION_CREDENTIALS vers un JSON Service Account',
    '',
    'Options:',
    '  --email <email>        (ex: admin@medilec.ch)',
    '  --role <role>          (défaut: admin)',
    '  --create               Crée l’utilisateur s’il n’existe pas',
    '  --password <password>  Mot de passe si --create (sinon généré)',
    '',
    'Exemple:',
    '  node scripts/set-admin-role.mjs --email admin@medilec.ch --role admin --create --password "..."',
    '',
  ].join('\n')
}

function requireEnv() {
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!gac || !String(gac).trim()) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS manquant. Télécharge un Service Account JSON depuis Firebase Console > Project settings > Service accounts, puis exporte GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/le.json',
    )
  }
}

function generatePassword() {
  // 24 chars base64url (sans caractères spéciaux "louches")
  return crypto.randomBytes(18).toString('base64url')
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    process.stdout.write(usage())
    return
  }

  const email = String(args.email || process.env.ADMIN_EMAIL || '').trim()
  const role = String(args.role || 'admin').trim()

  if (!email) {
    throw new Error('Email manquant. Fournis --email ou ADMIN_EMAIL.')
  }

  if (!role) {
    throw new Error('Role manquant. Fournis --role (ex: admin).')
  }

  requireEnv()

  initializeApp({
    credential: applicationDefault(),
  })

  const auth = getAuth()

  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : ''
    if (code === 'auth/user-not-found') {
      if (!args.create) {
        throw new Error(
          `Utilisateur introuvable (${email}). Relance avec --create (et idéalement --password).`,
        )
      }

      const password = args.password ? String(args.password) : generatePassword()
      if (password.length < 6) {
        throw new Error('Mot de passe trop court: Firebase exige au moins 6 caractères.')
      }

      user = await auth.createUser({
        email,
        password,
        emailVerified: true,
      })

      process.stdout.write(`Utilisateur créé: ${email}\n`)
      if (!args.password) {
        process.stdout.write(`Mot de passe généré (à conserver): ${password}\n`)
      }
    } else {
      throw err
    }
  }

  const existingClaims = user.customClaims && typeof user.customClaims === 'object' ? user.customClaims : {}
  const nextClaims = {
    ...existingClaims,
    role,
  }

  await auth.setCustomUserClaims(user.uid, nextClaims)

  process.stdout.write(`Claim mis à jour: uid=${user.uid} email=${email} role=${role}\n`)
  process.stdout.write('Note: l’utilisateur doit se reconnecter (ou refresh token) pour recevoir le nouveau claim.\n')
}

main().catch((err) => {
  process.stderr.write(`Erreur: ${String(err?.message || err)}\n`)
  process.stderr.write('---\n')
  process.stderr.write(usage())
  process.exit(1)
})
