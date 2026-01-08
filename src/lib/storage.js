import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage'

import { firebaseApp, isFirebaseConfigured } from './firebase.js'

// Firebase Storage — fail-soft
export const storage = isFirebaseConfigured ? getStorage(firebaseApp) : null

export function requireStorage() {
  if (storage) return storage

  throw new Error(
    'Firebase Storage non configuré. Renseigne les variables VITE_FIREBASE_* dans `.env.local` (voir `.env.example`).',
  )
}

export function getProductPdfStoragePath(productId, filename) {
  const pid = String(productId || '').trim()
  const name = String(filename || '').trim()
  if (!pid) throw new Error('productId requis')
  if (!name) throw new Error('filename requis')
  return `product-pdfs/${pid}/${name}`
}

export function getProductImageStoragePath(productId, filename) {
  const pid = String(productId || '').trim()
  const name = String(filename || '').trim()
  if (!pid) throw new Error('productId requis')
  if (!name) throw new Error('filename requis')
  return `product-images/${pid}/${name}`
}

export async function uploadProductPdf({
  productId,
  file,
  onProgress,
}) {
  const s = requireStorage()

  const pid = String(productId || '').trim()
  if (!pid) throw new Error('productId requis')

  if (!(file instanceof File)) throw new Error('Fichier invalide.')

  const contentType = String(file.type || '').toLowerCase()
  if (contentType !== 'application/pdf') {
    throw new Error('Format invalide: veuillez sélectionner un PDF.')
  }

  // Nom stable (évite les caractères bizarres)
  const safeName = `fiche.pdf`
  const fullPath = getProductPdfStoragePath(pid, safeName)

  const objRef = storageRef(s, fullPath)

  const task = uploadBytesResumable(objRef, file, {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=31536000',
  })

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (typeof onProgress === 'function') {
          const total = snap.totalBytes || 0
          const transferred = snap.bytesTransferred || 0
          const pct = total > 0 ? Math.round((transferred / total) * 100) : 0
          onProgress({ pct, transferred, total, state: snap.state })
        }
      },
      (err) => reject(err),
      async () => {
        const downloadURL = await getDownloadURL(objRef)
        resolve({ storagePath: fullPath, downloadURL })
      },
    )
  })
}

export async function uploadProductImage({ productId, file, onProgress }) {
  const s = requireStorage()

  const pid = String(productId || '').trim()
  if (!pid) throw new Error('productId requis')

  if (!(file instanceof File)) throw new Error('Fichier invalide.')

  const contentType = String(file.type || '').toLowerCase()
  if (!contentType.startsWith('image/')) {
    throw new Error('Format invalide: veuillez sélectionner une image (png/jpg/webp).')
  }

  // Nom stable (1 photo "principale" par produit pour le MVP)
  const ext = contentType === 'image/png'
    ? 'png'
    : contentType === 'image/webp'
      ? 'webp'
      : 'jpg'

  const safeName = `photo.${ext}`
  const fullPath = getProductImageStoragePath(pid, safeName)

  const objRef = storageRef(s, fullPath)

  const task = uploadBytesResumable(objRef, file, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  })

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (typeof onProgress === 'function') {
          const total = snap.totalBytes || 0
          const transferred = snap.bytesTransferred || 0
          const pct = total > 0 ? Math.round((transferred / total) * 100) : 0
          onProgress({ pct, transferred, total, state: snap.state })
        }
      },
      (err) => reject(err),
      async () => {
        const downloadURL = await getDownloadURL(objRef)
        resolve({ storagePath: fullPath, downloadURL })
      },
    )
  })
}

export async function deletePdfByStoragePath(storagePath) {
  const s = requireStorage()
  const p = String(storagePath || '').trim()
  if (!p) return
  await deleteObject(storageRef(s, p))
}

export async function deleteImageByStoragePath(storagePath) {
  const s = requireStorage()
  const p = String(storagePath || '').trim()
  if (!p) return
  await deleteObject(storageRef(s, p))
}
