import { push, ref, serverTimestamp, set, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { PhoneInput } from '../components/PhoneInput.jsx'
import { ShippingAddressForm } from '../components/ShippingAddressForm.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useCart } from '../hooks/useCart.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { rtdb } from '../lib/db.js'
import { composePhone, looksLikePhone, parsePhoneParts } from '../lib/phone.js'
import { isShippingAddressComplete, normalizeShippingAddress } from '../lib/shippingAddress.js'
import { slugify } from '../lib/slug.js'

import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { Input } from '../ui/Input.jsx'

function formatPrice(priceCents) {
  if (typeof priceCents !== 'number') return null
  return `${(priceCents / 100).toFixed(2)} CHF`
}

const SHIPPING_CENTS = 1100
const VAT_RATE = 0.077

export function CartPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const cart = useCart()
  const { user, isAuthenticated } = useAuth()

  const userPath = user?.uid ? `/users/${user.uid}` : null
  const { data: profileData } = useRtdbValue(userPath)

  const initialPhoneParts = useMemo(() => parsePhoneParts(profileData?.phone || ''), [profileData?.phone])
  const initialAddress = useMemo(
    () => normalizeShippingAddress(profileData?.shippingAddress || {}),
    [profileData?.shippingAddress],
  )

  const [phoneParts, setPhoneParts] = useState(() => ({ dialCode: '+41', national: '' }))
  const [shippingAddress, setShippingAddress] = useState(() => ({
    name: '',
    street: '',
    streetNo: '',
    postalCode: '',
    city: '',
    country: 'CH',
  }))

  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentOrderId, setSentOrderId] = useState('')

  useEffect(() => {
    setPhoneParts(initialPhoneParts)
  }, [initialPhoneParts])

  useEffect(() => {
    setShippingAddress(initialAddress)
  }, [initialAddress])

  const totalKnownCents = useMemo(() => {
    const allKnown = cart.items.every((x) => typeof x.priceCents === 'number')
    if (!allKnown) return null
    return cart.items.reduce((sum, x) => sum + x.qty * (x.priceCents || 0), 0)
  }, [cart.items])

  const totals = useMemo(() => {
    if (totalKnownCents == null) return null

    const subTotalCents = totalKnownCents
    const shippingCents = SHIPPING_CENTS
    const baseCents = subTotalCents + shippingCents
    // TVA is usually included in B2C prices in Switzerland, or added. 
    // Assuming here we add it on top of subtotal + shipping based on previous logic.
    // If prices are HT, this is correct for invoice estimation.
    const vatCents = Math.round(baseCents * VAT_RATE)
    const totalCents = baseCents + vatCents

    return { subTotalCents, shippingCents, vatCents, totalCents }
  }, [totalKnownCents])

  async function onSend() {
    setSendError('')
    setSentOrderId('')

    if (cart.items.length === 0) return

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    const nextPhone = composePhone(phoneParts)
    const nextAddress = normalizeShippingAddress(shippingAddress)

    if (!String(phoneParts?.national || '').trim()) {
      setSendError('Veuillez renseigner votre numéro de téléphone.')
      return
    }

    if (!looksLikePhone(nextPhone)) {
      setSendError('Numéro de téléphone invalide.')
      return
    }

    if (!isAuthenticated) {
      // Double check separate form visual logic if needed
    }

    // Checking Address
    if (!isShippingAddressComplete(nextAddress)) {
      setSendError('Veuillez remplir votre adresse de livraison complète.')
      return
    }

    if (!rtdb) {
      setSendError('Erreur configuration DB.')
      return
    }

    try {
      setSending(true)

      const orderRef = push(ref(rtdb, 'orders'))
      const orderId = orderRef.key
      if (!orderId) throw new Error('Erreur ID commande.')

      try {
        await update(ref(rtdb, `users/${user.uid}`), {
          email: user.email || null,
          phone: nextPhone,
          shippingAddress: nextAddress,
          updatedAt: serverTimestamp(),
        })
      } catch { /* ignore */ }

      const payload = {
        id: orderId,
        createdAt: Date.now(),
        status: 'new',
        source: 'web',
        user: {
          uid: user.uid,
          email: user.email || null,
          phone: nextPhone,
        },
        shippingAddress: nextAddress,
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
      await set(ref(rtdb, `userOrders/${user.uid}/${orderId}`), true)

      setSentOrderId(orderId)
      cart.clear()
      setNote('')
      window.scrollTo(0, 0)
    } catch (err) {
      setSendError(err?.message || 'Une erreur est survenue.')
    } finally {
      setSending(false)
    }
  }

  // --- UI Render ---

  if (sentOrderId) {
    return (
      <div className="mx-auto max-w-lg pt-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-swiss-neutral-900">Demande Envoyée !</h1>
        <p className="mt-4 text-swiss-neutral-600">
          Merci pour votre commande. Votre numéro de référence est <span className="font-mono font-medium text-swiss-neutral-900">{sentOrderId}</span>.
        </p>
        <p className="mt-2 text-sm text-swiss-neutral-500">
          Nous vous recontacterons très prochainement pour confirmer la disponibilité.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/catalog')}>Retour au catalogue</Button>
          <Button onClick={() => navigate('/my-orders')}>Voir mes commandes</Button>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-swiss-neutral-50 text-swiss-neutral-400">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-swiss-neutral-900">Votre panier est vide</h1>
        <p className="mt-2 text-swiss-neutral-500">Explorez notre catalogue pour trouver le matériel médical dont vous avez besoin.</p>
        <div className="mt-8">
          <Button size="lg" onClick={() => navigate('/catalog')}>Découvrir le catalogue</Button>
        </div>
      </div>
    )
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-swiss-neutral-900">Mon Panier</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
        {/* Left Column: Items */}
        <div className="space-y-6">
          <Card className="divide-y divide-swiss-neutral-100 overflow-hidden" padding="p-0">
            {cart.items.map((item) => {
              // Try to get an image?
              // Note: item in cart only has id, name, brand, priceCents. No image URL stored by default currently?
              // Should have updated cart.add to store image... 
              // For now, we don't have image in 'item', but we can try to guess or just show clear text.
              // Ideally we'd update useCart to store image url.
              // Let's assume we might fetch or just use a placeholder icon.

              return (
                <div key={item.id} className="flex gap-4 p-6 transition-colors hover:bg-swiss-neutral-50/50">
                  {/* Placeholder for Image - or upgrade cart to store it */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-swiss-neutral-100 bg-swiss-neutral-50">
                    {/* If we had item.cover, we would use it. For now a generic icon. */}
                    <div className="flex h-full w-full items-center justify-center text-swiss-neutral-300">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <h3 className="font-semibold text-swiss-neutral-900">
                          <Link to={`/product/${item.id}/${slugify(item.name || '')}`} className="hover:text-medilec-accent transition-colors">
                            {item.name || 'Produit Inconnu'}
                          </Link>
                        </h3>
                        <div className="font-medium text-swiss-neutral-900">
                          {formatPrice(item.priceCents * item.qty) || 'Sur demande'}
                        </div>
                      </div>
                      <p className="text-sm text-swiss-neutral-500">{item.brand}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-swiss-neutral-200">
                        <button
                          className="px-3 py-1 text-swiss-neutral-500 hover:bg-swiss-neutral-50 hover:text-swiss-neutral-900"
                          onClick={() => cart.setQty(item.id, Math.max(1, item.qty - 1))}
                        >-</button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">{item.qty}</span>
                        <button
                          className="px-3 py-1 text-swiss-neutral-500 hover:bg-swiss-neutral-50 hover:text-swiss-neutral-900"
                          onClick={() => cart.setQty(item.id, item.qty + 1)}
                        >+</button>
                      </div>

                      <button
                        onClick={() => cart.remove(item.id)}
                        className="text-xs font-medium text-swiss-neutral-400 hover:text-red-600 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>

          {/* Delivery Details Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-swiss-neutral-900">Livraison & Contact</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-swiss-neutral-500">Coordonnées</h3>
                <PhoneInput
                  idPrefix="cart-phone"
                  label="Téléphone (requis)"
                  dialCode={phoneParts.dialCode}
                  national={phoneParts.national}
                  onChange={setPhoneParts}
                  placeholder="79 123 45 67"
                />
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-swiss-neutral-500">Adresse de livraison</h3>
                <ShippingAddressForm
                  variant="plain"
                  value={shippingAddress}
                  onChange={setShippingAddress}
                />
              </Card>
            </div>

            <Card>
              <label htmlFor="note" className="mb-2 block text-sm font-medium text-swiss-neutral-700">Note pour la commande (optionnel)</label>
              <textarea
                id="note"
                className="min-h-[100px] w-full rounded-lg border border-swiss-neutral-200 p-3 text-sm focus:border-medilec-accent focus:ring-1 focus:ring-medilec-accent outline-none transition-all"
                placeholder="Instructions spéciales, urgence, références internes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Card>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div>
          <div className="sticky top-24 space-y-4">
            <Card className="bg-swiss-neutral-50/50 backdrop-blur-sm">
              <h2 className="mb-6 text-lg font-bold text-swiss-neutral-900">Résumé</h2>

              {totalKnownCents != null ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-swiss-neutral-600">
                    <span>Sous-total</span>
                    <span>{formatPrice(totals?.subTotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-swiss-neutral-600">
                    <span>Livraison estimée</span>
                    <span>{formatPrice(totals?.shippingCents)}</span>
                  </div>
                  <div className="flex justify-between text-swiss-neutral-600">
                    <span>TVA (7.7%)</span>
                    <span>{formatPrice(totals?.vatCents)}</span>
                  </div>

                  <div className="my-4 border-t border-swiss-neutral-200" />

                  <div className="flex justify-between items-end">
                    <span className="font-bold text-lg text-swiss-neutral-900">Total</span>
                    <span className="font-bold text-2xl text-medilec-accent">{formatPrice(totals?.totalCents)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-swiss-neutral-500 italic">
                  Le prix total sera confirmé sur devis car certains articles sont sur demande.
                </p>
              )}

              <div className="mt-8">
                <Button
                  className="w-full h-12 text-base shadow-swiss-md hover:shadow-swiss-lg transition-all transform hover:-translate-y-0.5"
                  onClick={onSend}
                  isLoading={sending}
                  disabled={cart.items.length === 0}
                >
                  Envoyer la demande
                </Button>
                <p className="mt-3 text-center text-xs text-swiss-neutral-500">
                  Aucun paiement immédiat requis.
                </p>
              </div>
            </Card>

            {sendError && (
              <div className="animate-in fade-in slide-in-from-top-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {sendError}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
