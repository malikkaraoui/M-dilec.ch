import { initializeApp } from 'firebase/app'

function readEnv(key) {
  const value = import.meta.env[key]
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function getFirebaseConfig() {
  const config = {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    databaseURL: readEnv('VITE_FIREBASE_DATABASE_URL'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  }

  // Minimum viable config pour éviter de casser le build en dev/preview.
  // On ne "devine" pas: si ce n’est pas configuré, on renvoie null.
  const required = ['apiKey', 'authDomain', 'projectId']
  const missingRequired = required.some((k) => !config[k])
  if (missingRequired) return null

  return config
}

export const firebaseConfig = getFirebaseConfig()
export const isFirebaseConfigured = Boolean(firebaseConfig)

export const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null
