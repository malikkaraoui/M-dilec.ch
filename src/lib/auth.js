import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

import { firebaseApp, isFirebaseConfigured } from './firebase.js'

// Firebase Auth (Email/Password + Google) — fail-soft.
// Si Firebase n'est pas configuré, on exporte `null` et les wrappers lèvent une erreur claire.
export const auth = isFirebaseConfigured ? getAuth(firebaseApp) : null
export const isAuthConfigured = Boolean(auth)

export const googleProvider = isAuthConfigured ? new GoogleAuthProvider() : null

export function requireAuth() {
  if (auth) return auth

  throw new Error(
    'Firebase Auth non configuré. Renseigne les variables VITE_FIREBASE_* dans `.env.local` (voir `.env.example`).',
  )
}

export async function signInEmailPassword(email, password) {
  const a = requireAuth()
  return signInWithEmailAndPassword(a, email, password)
}

export async function registerEmailPassword(email, password) {
  const a = requireAuth()
  return createUserWithEmailAndPassword(a, email, password)
}

export async function signInWithGooglePopup() {
  const a = requireAuth()
  if (!googleProvider) throw new Error('Google Provider non disponible (Auth non configuré).')
  return signInWithPopup(a, googleProvider)
}

export async function signOutUser() {
  const a = requireAuth()
  return signOut(a)
}
