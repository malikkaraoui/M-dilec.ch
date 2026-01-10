import fs from 'node:fs'
import path from 'node:path'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { get, ref as dbRef, set, update } from 'firebase/database'
import { afterAll, beforeAll, describe, it } from 'vitest'

const PROJECT_ID = 'medilec-ch-default-rtdb'

function readRules(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

function makeOrder({
  id,
  uid,
  email = 'user@example.com',
  phone = '+41 00 000 00 00',
  status = 'new',
  note = 'Besoin de conseil',
  includeAdminNote = false,
  includeUpdatedAt = false,
}) {
  const payload = {
    id,
    createdAt: Date.now(),
    status,
    user: { uid, email, phone },
    items: {
      0: { id: 'p1', qty: 1, name: 'Produit test' },
    },
    note,
  }

  if (includeAdminNote) payload.adminNote = 'Note admin injectée'
  if (includeUpdatedAt) payload.updatedAt = Date.now()

  return payload
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

describe('Realtime Database rules (orders + admin fields)', () => {
  it('admin can read /orders list', async () => {
    const uid = 'user_orders_list_1'
    const orderId = 'order_orders_list_1'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
    })

    const adminCtx = testEnv.authenticatedContext('admin_orders_list_1', { role: 'admin' })
    const db = adminCtx.database()
    await assertSucceeds(get(dbRef(db, 'orders')))
  })

  it('user cannot read /orders list', async () => {
    const uid = 'user_orders_list_2'
    const orderId = 'order_orders_list_2'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
    })

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()
    await assertFails(get(dbRef(db, 'orders')))
  })

  it('admin can create an order for any user', async () => {
    const uid = 'user_target_1'
    const orderId = 'order_admin_create_1'

    const adminCtx = testEnv.authenticatedContext('admin_create_1', { role: 'admin' })
    const db = adminCtx.database()

    await assertSucceeds(set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid })))
  })

  it('user can write their own profile (/users/{uid})', async () => {
    const uid = 'user_profile_1'
    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(
      update(dbRef(db, `users/${uid}`), {
        phone: '+41 79 000 00 00',
        email: 'user_profile_1@example.com',
        updatedAt: Date.now(),
      }),
    )
  })

  it('user can write firstName/lastName in profile', async () => {
    const uid = 'user_profile_name_1'
    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(
      update(dbRef(db, `users/${uid}`), {
        firstName: 'Jean',
        lastName: 'Dupont',
        updatedAt: Date.now(),
      }),
    )
  })

  it('user can write their shipping address in profile', async () => {
    const uid = 'user_profile_addr_1'
    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(
      update(dbRef(db, `users/${uid}`), {
        shippingAddress: {
          name: 'Dupont SA',
          street: 'Rue de la Gare',
          streetNo: '12',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'CH',
        },
        updatedAt: Date.now(),
      }),
    )
  })

  it('user can create an order (and link it in /userOrders)', async () => {
    const uid = 'user_create_1'
    const orderId = 'order_create_1'

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid })))

    await assertSucceeds(set(dbRef(db, `userOrders/${uid}/${orderId}`), true))
  })

  it('user can create an order with shippingAddress', async () => {
    const uid = 'user_create_addr_1'
    const orderId = 'order_create_addr_1'

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(
      set(dbRef(db, `orders/${orderId}`), {
        ...makeOrder({ id: orderId, uid }),
        shippingAddress: {
          name: 'Dupont SA',
          street: 'Rue de la Gare',
          streetNo: '12',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'CH',
        },
      }),
    )
  })

  it('user can read their own order', async () => {
    const uid = 'user_1'
    const orderId = 'order_1'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
    })

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()
    await assertSucceeds(get(dbRef(db, `orders/${orderId}`)))
  })

  it('user cannot update an existing order (owner)', async () => {
    const uid = 'user_2'
    const orderId = 'order_2'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
    })

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()
    await assertFails(update(dbRef(db, `orders/${orderId}`), { note: 'Je modifie ma commande' }))
  })

  it('admin can update status + adminNote', async () => {
    const uid = 'user_4'
    const orderId = 'order_4'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
    })

    const adminCtx = testEnv.authenticatedContext('admin_1', { role: 'admin' })
    const db = adminCtx.database()

    await assertSucceeds(update(dbRef(db, `orders/${orderId}`), { status: 'processing' }))
    await assertSucceeds(update(dbRef(db, `orders/${orderId}`), { adminNote: 'OK, on traite.' }))
  })

  it("user cannot read another user's order", async () => {
    const ownerUid = 'user_5'
    const otherUid = 'user_6'
    const orderId = 'order_5'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid: ownerUid }))
    })

    const otherCtx = testEnv.authenticatedContext(otherUid)
    const db = otherCtx.database()

    await assertFails(get(dbRef(db, `orders/${orderId}`)))
  })

  it('admin can delete an order and cleanup /userOrders link', async () => {
    const uid = 'user_delete_1'
    const orderId = 'order_delete_1'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
      await set(dbRef(db, `userOrders/${uid}/${orderId}`), true)
    })

    const adminCtx = testEnv.authenticatedContext('admin_delete_1', { role: 'admin' })
    const db = adminCtx.database()

    await assertSucceeds(
      update(dbRef(db), {
        [`orders/${orderId}`]: null,
        [`userOrders/${uid}/${orderId}`]: null,
      }),
    )

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db2 = ctx.database()
      const orderSnap = await get(dbRef(db2, `orders/${orderId}`))
      const linkSnap = await get(dbRef(db2, `userOrders/${uid}/${orderId}`))
      if (orderSnap.exists()) throw new Error('Order should have been deleted')
      if (linkSnap.exists()) throw new Error('userOrders link should have been deleted')
    })
  })

  it('user cannot delete an existing order (even owner)', async () => {
    const uid = 'user_delete_2'
    const orderId = 'order_delete_2'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `orders/${orderId}`), makeOrder({ id: orderId, uid }))
      await set(dbRef(db, `userOrders/${uid}/${orderId}`), true)
    })

    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertFails(
      update(dbRef(db), {
        [`orders/${orderId}`]: null,
        [`userOrders/${uid}/${orderId}`]: null,
      }),
    )
  })
})

describe('Realtime Database rules (products slug)', () => {
  it('admin can write a product with a valid slug', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_products_slug_1', { role: 'admin' })
    const db = adminCtx.database()

    await assertSucceeds(
      set(dbRef(db, 'products/p_slug_ok_1'), {
        name: 'Produit Test',
        slug: 'produit-test',
        priceCents: 12990,
      }),
    )
  })

  it('admin cannot write a product with an invalid slug', async () => {
    const adminCtx = testEnv.authenticatedContext('admin_products_slug_2', { role: 'admin' })
    const db = adminCtx.database()

    await assertFails(
      set(dbRef(db, 'products/p_slug_bad_1'), {
        name: 'Produit Test',
        slug: 'Produit Test !',
        priceCents: 12990,
      }),
    )
  })
})

describe('Realtime Database rules (carts)', () => {
  it('user can write their own cart (/carts/{uid})', async () => {
    const uid = 'cart_user_1'
    const userCtx = testEnv.authenticatedContext(uid)
    const db = userCtx.database()

    await assertSucceeds(
      set(dbRef(db, `carts/${uid}`), {
        uid,
        updatedAt: Date.now(),
        items: {
          p1: { id: 'p1', qty: 2, name: 'Produit', brand: 'Marque', priceCents: 12990 },
        },
      }),
    )
  })

  it('user cannot write another user cart', async () => {
    const ownerUid = 'cart_user_2'
    const otherUid = 'cart_user_3'

    const otherCtx = testEnv.authenticatedContext(otherUid)
    const db = otherCtx.database()

    await assertFails(
      set(dbRef(db, `carts/${ownerUid}`), {
        uid: ownerUid,
        updatedAt: Date.now(),
        items: { p1: { id: 'p1', qty: 1 } },
      }),
    )
  })

  it('admin can read carts root', async () => {
    const uid = 'cart_user_4'

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database()
      await set(dbRef(db, `carts/${uid}`), {
        uid,
        updatedAt: Date.now(),
        items: { p1: { id: 'p1', qty: 1 } },
      })
    })

    const adminCtx = testEnv.authenticatedContext('admin_cart_1', { role: 'admin' })
    const db = adminCtx.database()
    await assertSucceeds(get(dbRef(db, 'carts')))
  })

  it('guest can write and read their own guest cart (/guestCarts/{cartId})', async () => {
    const cartId = 'guest_cart_1'
    const anonCtx = testEnv.unauthenticatedContext()
    const db = anonCtx.database()

    await assertSucceeds(
      set(dbRef(db, `guestCarts/${cartId}`), {
        cartId,
        updatedAt: Date.now(),
        items: { p1: { id: 'p1', qty: 1 } },
      }),
    )

    await assertSucceeds(get(dbRef(db, `guestCarts/${cartId}`)))
  })
})
