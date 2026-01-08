import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import admin from 'firebase-admin'

function usage() {
  const cmd = path.basename(process.argv[1] || 'node')
  console.log(`\nUsage:\n  SERVICE_ACCOUNT_PATH=./serviceAccount.medilec-ch.json node ${cmd} <uid|email> <true|false>\n\nExemples:\n  SERVICE_ACCOUNT_PATH=./serviceAccount.medilec-ch.json node ${cmd} alain@example.ch true\n  SERVICE_ACCOUNT_PATH=./serviceAccount.medilec-ch.json node ${cmd} <UID> false\n`)
}

function parseBoolean(value, defaultValue = true) {
  if (value == null || value === '') return defaultValue
  const v = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(v)) return false
  return defaultValue
}

function readJsonFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const uidOrEmail = process.argv[2]
  const enabled = parseBoolean(process.argv[3], true)

  if (!uidOrEmail) {
    usage()
    process.exitCode = 1
    return
  }

  const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH
  if (!serviceAccountPath) {
    console.error('Erreur: variable SERVICE_ACCOUNT_PATH manquante (chemin vers le JSON service account).')
    usage()
    process.exitCode = 1
    return
  }

  const serviceAccount = readJsonFile(serviceAccountPath)

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  const auth = admin.auth()

  let uid = ''
  if (String(uidOrEmail).includes('@')) {
    const user = await auth.getUserByEmail(String(uidOrEmail).trim())
    uid = user.uid
  } else {
    uid = String(uidOrEmail).trim()
  }

  const userRecord = await auth.getUser(uid)
  const existing = userRecord.customClaims || {}

  const nextClaims = { ...existing }
  if (enabled) {
    nextClaims.admin = true
  } else {
    delete nextClaims.admin
  }

  await auth.setCustomUserClaims(uid, nextClaims)

  console.log(`OK: admin=${enabled ? 'true' : 'false'} pour UID=${uid}`)
  console.log('Note: l’utilisateur doit se reconnecter, ou forcer un refresh du token, pour récupérer le claim.')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
