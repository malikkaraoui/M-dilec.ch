import { push, ref, serverTimestamp, set, update } from 'firebase/database'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useCart } from '../hooks/useCart.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { rtdb } from '../lib/db.js'

function formatPrice(priceCents) {
  if (typeof priceCents !== 'number') return null
  return `${(priceCents / 100).toFixed(2)} CHF`
}

export function CartPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const cart = useCart()
  const { user, isAuthenticated } = useAuth()

  const userPath = user?.uid ? `/users/${user.uid}` : null
  const { data: profileData } = useRtdbValue(userPath)

  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentOrderId, setSentOrderId] = useState('')

  const totalKnownCents = useMemo(() => {
    const allKnown = cart.items.every((x) => typeof x.priceCents === 'number')
    if (!allKnown) return null
    return cart.items.reduce((sum, x) => sum + x.qty * (x.priceCents || 0), 0)
  }, [cart.items])

  async function onSend() {
    setSendError('')
    setSentOrderId('')

    if (cart.items.length === 0) return

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    const phone = typeof profileData?.phone === 'string' ? profileData.phone.trim() : ''
    if (!phone) {
      navigate('/profile', { state: { from: location.pathname, reason: 'phone-required' } })
      return
    }

    if (!rtdb) {
      setSendError(
        'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
      )
      return
    }

    try {
      setSending(true)

      const orderRef = push(ref(rtdb, 'orders'))
      const orderId = orderRef.key
      if (!orderId) throw new Error('Impossible de générer un identifiant de commande.')

      const payload = {
        id: orderId,
        createdAt: serverTimestamp(),
        status: 'new',
        source: 'web',

        user: {
          uid: user.uid,
          email: user.email || null,
          phone,
        },

        note: note.trim() || null,
        items: cart.items.map((x) => ({
          id: x.id,
          qty: x.qty,
          name: x.name || null,
          brand: x.brand || null,
          priceCents: typeof x.priceCents === 'number' ? x.priceCents : null,
        })),
      }

      await set(orderRef, payload)
      await update(ref(rtdb), {
        [`userOrders/${user.uid}/${orderId}`]: true,
      })

      setSentOrderId(orderId)
      cart.clear()
      setNote('')
    } catch (err) {
      setSendError(err?.message || 'Envoi impossible.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Panier</h1>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/catalog">
          ← Continuer mes achats
        </Link>
      </div>

      {sentOrderId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Demande envoyée. Référence: <span className="font-mono">{sentOrderId}</span>
          <div className="mt-2">
            <Link className="text-blue-700 hover:underline" to="/my-orders">
              Voir mes demandes
            </Link>
          </div>
        </div>
      ) : null}

      {cart.items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          Votre panier est vide.
          <div className="mt-2">
            <Link className="text-blue-600 hover:underline" to="/catalog">
              Aller au catalogue
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr,360px]">
          <div className="space-y-3">
            <ul className="space-y-2">
              {cart.items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">
                        {item.name || item.id}
                      </div>
                      {item.brand ? <div className="mt-1 text-xs text-neutral-500">{item.brand}</div> : null}
                      <div className="mt-2 text-xs text-neutral-500">
                        {formatPrice(item.priceCents) || 'Prix sur demande'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>
                        Quantité
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        className="w-20 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
                        min={1}
                        value={item.qty}
                        onChange={(e) => cart.setQty(item.id, Number(e.target.value))}
                        type="number"
                      />
                      <button
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                        onClick={() => cart.remove(item.id)}
                        type="button"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Link className="text-xs text-blue-600 hover:underline" to={`/product/${item.id}`}>
                      Voir la fiche
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <button
              className="text-sm text-neutral-700 hover:text-neutral-900"
              onClick={() => cart.clear()}
              type="button"
            >
              Vider le panier
            </button>
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">Envoyer une demande</h2>
            <p className="mt-1 text-sm text-neutral-600">
              MVP: pas de paiement. Nous vous recontactons pour confirmer disponibilité/prix.
            </p>

            {totalKnownCents != null ? (
              <div className="mt-3 text-sm">
                Total estimé: <span className="font-semibold">{formatPrice(totalKnownCents)}</span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-neutral-500">Total à confirmer (prix sur demande possible).</div>
            )}

            <div className="mt-4 space-y-1">
              <label className="text-sm font-medium" htmlFor="order-note">
                Note (optionnel)
              </label>
              <textarea
                id="order-note"
                className="min-h-20 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: urgent / remplacer un modèle / compatibilité année…"
              />
            </div>

            {sendError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {sendError}
              </div>
            ) : null}

            <button
              className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--medilec-accent)' }}
              disabled={sending || cart.items.length === 0}
              onClick={onSend}
              type="button"
            >
              {sending ? 'Envoi…' : 'Envoyer la demande'}
            </button>

            <div className="mt-3 text-xs text-neutral-500">
              Si vous n’êtes pas connecté, vous serez invité à vous connecter. Le téléphone est requis.
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
