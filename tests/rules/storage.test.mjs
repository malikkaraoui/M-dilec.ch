import fs from 'node:fs'
import path from 'node:path'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { getBytes, ref as storageRef, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, describe, it } from 'vitest'

const PROJECT_ID = 'medilec-ch'

function readRules(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readRules('database.rules.json'),
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: readRules('storage.rules'),
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

describe('Storage rules (product PDFs)', () => {
  it('admin can upload a PDF under product-pdfs/{productId}/', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_1', { role: 'admin' })
    const storage = adminCtx.storage()

    const fileRef = storageRef(storage, 'product-pdfs/p1/fiche.pdf')
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF" signature start

    await assertSucceeds(uploadBytes(fileRef, bytes, { contentType: 'application/pdf' }))
  })

  it('non-admin cannot upload PDFs', async () => {
    const userCtx = testEnv.authenticatedContext('user_1')
    const storage = userCtx.storage()

    const fileRef = storageRef(storage, 'product-pdfs/p1/fiche.pdf')
    const bytes = new Uint8Array([1, 2, 3])

    await assertFails(uploadBytes(fileRef, bytes, { contentType: 'application/pdf' }))
  })

  it('public can read PDFs', async () => {
    // Seed a file without rules, then read it as unauthenticated.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const storage = ctx.storage()
      const fileRef = storageRef(storage, 'product-pdfs/p2/fiche.pdf')
      const bytes = new Uint8Array([1, 2, 3, 4, 5])
      await uploadBytes(fileRef, bytes, { contentType: 'application/pdf' })
    })

    const anonCtx = testEnv.unauthenticatedContext()
    const storage = anonCtx.storage()

    const fileRef = storageRef(storage, 'product-pdfs/p2/fiche.pdf')
    await assertSucceeds(getBytes(fileRef))
  })

  it('admin upload is rejected if contentType is not application/pdf', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_2', { role: 'admin' })
    const storage = adminCtx.storage()

    const fileRef = storageRef(storage, 'product-pdfs/p3/fiche.pdf')
    const bytes = new Uint8Array([1, 2, 3])

    await assertFails(uploadBytes(fileRef, bytes, { contentType: 'text/plain' }))
  })
})

describe('Storage rules (product images)', () => {
  it('admin can upload an image under product-images/{productId}/', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_img_1', { role: 'admin' })
    const storage = adminCtx.storage()

    const fileRef = storageRef(storage, 'product-images/p1/photo.jpg')
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]) // JPEG header-ish

    await assertSucceeds(uploadBytes(fileRef, bytes, { contentType: 'image/jpeg' }))
  })

  it('non-admin cannot upload images', async () => {
    const userCtx = testEnv.authenticatedContext('user_img_1')
    const storage = userCtx.storage()

    const fileRef = storageRef(storage, 'product-images/p1/photo.jpg')
    const bytes = new Uint8Array([1, 2, 3])

    await assertFails(uploadBytes(fileRef, bytes, { contentType: 'image/jpeg' }))
  })

  it('public can read images', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const storage = ctx.storage()
      const fileRef = storageRef(storage, 'product-images/p2/photo.png')
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header-ish
      await uploadBytes(fileRef, bytes, { contentType: 'image/png' })
    })

    const anonCtx = testEnv.unauthenticatedContext()
    const storage = anonCtx.storage()

    const fileRef = storageRef(storage, 'product-images/p2/photo.png')
    await assertSucceeds(getBytes(fileRef))
  })

  it('admin upload is rejected if contentType is not image/*', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_img_2', { role: 'admin' })
    const storage = adminCtx.storage()

    const fileRef = storageRef(storage, 'product-images/p3/photo.jpg')
    const bytes = new Uint8Array([1, 2, 3])

    await assertFails(uploadBytes(fileRef, bytes, { contentType: 'application/pdf' }))
  })
})
