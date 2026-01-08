import { getDatabase } from 'firebase/database'

import { firebaseApp, isFirebaseConfigured } from './firebase.js'

// RTDB (Realtime Database) — choisi pour le MVP.
// Fail-soft: si les variables VITE_FIREBASE_* ne sont pas renseignées, on n'initialise rien.
export const rtdb = isFirebaseConfigured ? getDatabase(firebaseApp) : null

export function requireRtdb() {
  if (rtdb) return rtdb

  throw new Error(
    'Firebase RTDB non configuré. Renseigne les variables VITE_FIREBASE_* dans `.env.local` (voir `.env.example`).',
  )
}
