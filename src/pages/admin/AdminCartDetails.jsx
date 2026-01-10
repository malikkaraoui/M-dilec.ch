import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useRtdbValue } from '../../hooks/useRtdbValue.js'

function centsToChf(cents) {
  const n = Number(cents)
  if (!Number.isFinite(n)) return 0
  return n / 100
}

function formatChfFromCents(cents) {
  const chf = centsToChf(cents)
  try {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(chf)
  } catch {
    return `${chf.toFixed(2)} CHF`
  }
}

function parseChfToCents(input) {
  const s = String(input || '').trim().replace(',', '.')
  if (!s) return 0
  const n = Number(s)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n * 100))
}

function normalizePhoneForTel(value) {
  return String(value || '').replace(/[^+0-9]/g, '')
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    return true
  } catch {
    return false
  }
}

function isSmallScreen() {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(max-width: 640px)').matches
  } catch {
    return window.innerWidth <= 640
  }
}

function normalizeItems(items) {
  const raw = items && typeof items === 'object' ? items : null
  if (!raw) return []
  return Object.values(raw)
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      id: typeof it.id === 'string' ? it.id : '',
      qty: Number(it.qty) || 0,
      name: typeof it.name === 'string' ? it.name : '',
      brand: typeof it.brand === 'string' ? it.brand : '',
      priceCents: typeof it.priceCents === 'number' ? it.priceCents : null,
    }))
    .filter((it) => it.id && it.qty > 0)
}

export function AdminCartDetailsPage() {
  const params = useParams()
  const kind = typeof params.kind === 'string' ? params.kind : ''
  const id = typeof params.id === 'string' ? params.id : ''

  const isUsers = kind === 'users'
  const isGuests = kind === 'guests'

  const cartPath = isUsers ? `/carts/${id}` : isGuests ? `/guestCarts/${id}` : null
  const { status: cartStatus, data: cartData, error: cartError } = useRtdbValue(cartPath)

  const userPath = isUsers && id ? `/users/${id}` : null
  const { status: userStatus, data: userData } = useRtdbValue(userPath)

  const items = useMemo(() => normalizeItems(cartData?.items), [cartData])

  const subtotalCents = useMemo(() => {
    let sum = 0
    for (const it of items) {
      const unit = typeof it.priceCents === 'number' ? it.priceCents : 0
      sum += Math.max(0, Math.trunc(it.qty)) * unit
    }
    return sum
  }, [items])

  const [shippingChf, setShippingChf] = useState('0')
  const [discountMode, setDiscountMode] = useState('percent') // 'percent' | 'amount'
  const [discountValue, setDiscountValue] = useState('0')

  const shippingCents = useMemo(() => parseChfToCents(shippingChf), [shippingChf])

  const discountCents = useMemo(() => {
    if (discountMode === 'amount') {
      const c = parseChfToCents(discountValue)
      return Math.min(c, subtotalCents)
    }

    const pct = Number(String(discountValue || '').replace(',', '.'))
    if (!Number.isFinite(pct) || pct <= 0) return 0
    const bounded = Math.max(0, Math.min(100, pct))
    return Math.min(subtotalCents, Math.round((subtotalCents * bounded) / 100))
  }, [discountMode, discountValue, subtotalCents])

  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents)

  // Feedback copier
  const [copiedKey, setCopiedKey] = useState('')
  const timeoutRef = useRef(null)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function onCopy(key, value) {
    if (!value) return
    const ok = await copyToClipboard(value)
    if (!ok && typeof window !== 'undefined') {
      window.prompt('Copiez:', String(value))
      return
    }

    setCopiedKey(key)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopiedKey(''), 1200)
  }

  async function onPhoneClick(phone) {
    const raw = String(phone || '').trim()
    if (!raw) return
    if (isSmallScreen() && typeof window !== 'undefined') {
      window.location.href = `tel:${normalizePhoneForTel(raw)}`
      return
    }
    await onCopy('phone', raw)
  }

  const email = typeof userData?.email === 'string' ? userData.email : ''
  const phone = typeof userData?.phone === 'string' ? userData.phone : ''

  const title = isUsers ? 'Panier utilisateur (détail)' : isGuests ? 'Panier invité (détail)' : 'Panier (détail)'

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-1 text-xs text-neutral-500">
            Identifiant: <span className="font-mono">{id || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/admin/carts">
            ← Retour
          </Link>
        </div>
      </div>

      {cartStatus === 'loading' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Chargement…</div>
      ) : null}

      {cartStatus === 'error' || cartError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Accès refusé ou panier introuvable.
        </div>
      ) : null}

      {cartStatus === 'success' && !cartData ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">Introuvable.</div>
      ) : null}

      {cartStatus === 'success' && cartData ? (
        <div className="grid gap-4 lg:grid-cols-[1fr,420px]">
          <div className="space-y-3">
            {isUsers ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">Client</div>
                <div className="mt-2 text-sm text-neutral-800">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {email ? (
                      <a className="text-blue-700 hover:underline" href={`mailto:${email}`}>
                        {email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                    {userStatus === 'loading' ? <span className="text-xs text-neutral-500">(chargement…)</span> : null}
                  </div>
                  <div className="mt-1">
                    {phone ? (
                      <button
                        type="button"
                        className="text-left text-neutral-700 hover:underline"
                        onClick={() => onPhoneClick(phone)}
                        title={isSmallScreen() ? 'Appeler' : 'Copier'}
                      >
                        {phone}
                      </button>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-neutral-500">UID: {id || '—'}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                    onClick={() => onCopy('email', email)}
                    disabled={!email}
                  >
                    {copiedKey === 'email' ? 'Copié !' : 'Copier email'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                    onClick={() => onCopy('phone', phone)}
                    disabled={!phone}
                  >
                    {copiedKey === 'phone' ? 'Copié !' : 'Copier tél.'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50"
                    onClick={() => onCopy('uid', id)}
                    disabled={!id}
                  >
                    {copiedKey === 'uid' ? 'Copié !' : 'Copier UID'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Articles</div>

              {items.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">Aucun article.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((it, idx) => {
                    const unit = typeof it.priceCents === 'number' ? it.priceCents : null
                    const line = typeof unit === 'number' ? unit * Math.max(0, Math.trunc(it.qty)) : null
                    return (
                      <li key={`${it.id}-${idx}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-neutral-900">{it.name || it.id}</div>
                            {it.brand ? <div className="mt-1 text-xs text-neutral-500">{it.brand}</div> : null}
                            <div className="mt-1 font-mono text-[11px] text-neutral-500">{it.id}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-neutral-900">Qté: {it.qty}</div>
                            <div className="mt-1 text-xs text-neutral-600">
                              {typeof unit === 'number' ? `PU: ${formatChfFromCents(unit)}` : 'PU: —'}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-neutral-900">
                              {typeof line === 'number' ? formatChfFromCents(line) : '—'}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-neutral-500">Sous-total</div>
                <div className="text-lg font-semibold text-neutral-900">{formatChfFromCents(subtotalCents)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-neutral-700" htmlFor="admin-cart-shipping">
                    Frais de livraison (CHF)
                  </label>
                  <input
                    id="admin-cart-shipping"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    inputMode="decimal"
                    value={shippingChf}
                    onChange={(e) => setShippingChf(e.target.value)}
                    placeholder="0.00"
                    type="text"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700" htmlFor="admin-cart-discount-mode">
                    Remise
                  </label>
                  <select
                    id="admin-cart-discount-mode"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={discountMode}
                    onChange={(e) => setDiscountMode(e.target.value)}
                  >
                    <option value="percent">% (sur sous-total)</option>
                    <option value="amount">CHF (sur sous-total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700" htmlFor="admin-cart-discount-value">
                  Valeur remise
                </label>
                <input
                  id="admin-cart-discount-value"
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountMode === 'percent' ? 'ex: 10' : 'ex: 50'}
                  type="text"
                />
                <div className="mt-1 text-xs text-neutral-500">Remise calculée: {formatChfFromCents(discountCents)}</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">Total</span>
                  <span className="font-semibold text-neutral-900">{formatChfFromCents(totalCents)}</span>
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Total = sous-total − remise + livraison.
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
