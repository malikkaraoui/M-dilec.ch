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
    const adminCtx = testEnv.authenticatedContext('admin_1', { admin: true })
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
    const adminCtx = testEnv.authenticatedContext('admin_2', { admin: true })
    const storage = adminCtx.storage()

    const fileRef = storageRef(storage, 'product-pdfs/p3/fiche.pdf')
    const bytes = new Uint8Array([1, 2, 3])

    await assertFails(uploadBytes(fileRef, bytes, { contentType: 'text/plain' }))
  })
})
