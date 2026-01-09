import { useEffect, useMemo, useRef, useState } from 'react'

import { searchChAddresses, validateChPostalCity } from '../lib/chAddressApi.js'
import { normalizeShippingAddress } from '../lib/shippingAddress.js'

function toStr(v) {
  return String(v || '').trim()
}

export function ShippingAddressForm({
  value,
  onChange,
  title = 'Adresse de livraison',
  description,
  requiredNotice,
  variant = 'card',
}) {
  const v = normalizeShippingAddress(value)

  const country = toStr(v.country) || 'CH'

  const [streetQuery, setStreetQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSug, setLoadingSug] = useState(false)
  const [sugError, setSugError] = useState('')

  const [zipCityError, setZipCityError] = useState('')

  const abortRef = useRef(null)

  const canAutocomplete = country === 'CH'

  const streetSearchText = useMemo(() => {
    const street = toStr(streetQuery)
    const pc = toStr(v.postalCode)
    const city = toStr(v.city)

    // On essaye de restreindre la recherche si CP/Ville connus.
    const tail = [pc, city].filter(Boolean).join(' ')
    return tail ? `${street}, ${tail}` : street
  }, [streetQuery, v.postalCode, v.city])

  useEffect(() => {
    if (!canAutocomplete) return

    const q = toStr(streetQuery)
    if (q.length < 2) {
      setSuggestions([])
      setSugError('')
      return
    }

    setSugError('')
    setLoadingSug(true)

    const t = window.setTimeout(async () => {
      try {
        abortRef.current?.abort?.()
        const controller = new AbortController()
        abortRef.current = controller

        const res = await searchChAddresses({
          searchText: streetSearchText,
          limit: 6,
          signal: controller.signal,
        })
        setSuggestions(res)
      } catch (e) {
        // Abort = normal
        if (String(e?.name) === 'AbortError') return
        setSugError('Suggestions indisponibles.')
        setSuggestions([])
      } finally {
        setLoadingSug(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(t)
      abortRef.current?.abort?.()
    }
  }, [streetQuery, streetSearchText, canAutocomplete])

  async function onBlurPostalOrCity() {
    if (!canAutocomplete) return

    // Fail-soft : on n'empêche pas la saisie, mais on affiche un message si incohérent.
    try {
      const controller = new AbortController()
      const res = await validateChPostalCity({
        postalCode: v.postalCode,
        city: v.city,
        signal: controller.signal,
      })

      if (!res.ok && res.reason === 'zip-format') {
        setZipCityError('Code postal invalide (CH = 4 chiffres).')
        return
      }

      if (!res.ok && res.reason === 'mismatch') {
        setZipCityError('Le code postal ne correspond pas à la ville. Vérifiez la saisie.')
        return
      }

      setZipCityError('')
    } catch {
      // fail-soft
      setZipCityError('')
    }
  }

  function patch(nextPartial) {
    onChange?.({
      name: toStr(v.name),
      street: toStr(v.street),
      streetNo: toStr(v.streetNo),
      postalCode: toStr(v.postalCode),
      city: toStr(v.city),
      country: toStr(country),
      ...nextPartial,
    })
  }

  const content = (
    <>
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-neutral-600">{description}</p> : null}
      {requiredNotice ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {requiredNotice}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="ship-name">
            Nom (destinataire)
          </label>
          <input
            id="ship-name"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
            style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
            value={toStr(v.name)}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Ex: Dupont SA"
            type="text"
            autoComplete="name"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr,140px]">
          <div className="space-y-1 relative">
            <label className="text-sm font-medium" htmlFor="ship-street">
              Rue
            </label>
            <input
              id="ship-street"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={toStr(v.street)}
              onChange={(e) => {
                patch({ street: e.target.value })
                setStreetQuery(e.target.value)
              }}
              onFocus={(e) => setStreetQuery(e.target.value)}
              placeholder="Rue de la Gare"
              type="text"
              autoComplete="street-address"
            />

            {canAutocomplete && (loadingSug || suggestions.length > 0 || sugError) ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                {sugError ? (
                  <div className="px-3 py-2 text-xs text-neutral-600">{sugError}</div>
                ) : null}

                {loadingSug ? (
                  <div className="px-3 py-2 text-xs text-neutral-600">Suggestions…</div>
                ) : null}

                {!loadingSug && suggestions.length > 0 ? (
                  <ul className="max-h-56 overflow-auto py-1">
                    {suggestions.map((s, idx) => (
                      <li key={`${s.label}-${idx}`}>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            patch({
                              street: s.street || toStr(v.street),
                              streetNo: s.streetNo || toStr(v.streetNo),
                              postalCode: s.postalCode || toStr(v.postalCode),
                              city: s.city || toStr(v.city),
                              country: s.country || 'CH',
                            })
                            setSuggestions([])
                            setStreetQuery('')
                            setZipCityError('')
                          }}
                        >
                          <div className="text-sm font-medium">{s.label}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ship-streetNo">
              N°
            </label>
            <input
              id="ship-streetNo"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={toStr(v.streetNo)}
              onChange={(e) => patch({ streetNo: e.target.value })}
              placeholder="12"
              type="text"
              autoComplete="address-line2"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[160px,1fr]">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ship-postal">
              Code postal
            </label>
            <input
              id="ship-postal"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={toStr(v.postalCode)}
              onChange={(e) => patch({ postalCode: e.target.value })}
              onBlur={onBlurPostalOrCity}
              placeholder="1000"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ship-city">
              Ville
            </label>
            <input
              id="ship-city"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={toStr(v.city)}
              onChange={(e) => patch({ city: e.target.value })}
              onBlur={onBlurPostalOrCity}
              placeholder="Lausanne"
              type="text"
              autoComplete="address-level2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="ship-country">
            Pays
          </label>
          <input
            id="ship-country"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
            style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
            value={toStr(country)}
            onChange={(e) => patch({ country: e.target.value })}
            placeholder="CH"
            type="text"
            autoComplete="country-name"
          />
          <div className="text-xs text-neutral-500">Astuce: pour l’autocomplétion, mettez “CH”.</div>
        </div>

        {zipCityError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {zipCityError}
          </div>
        ) : null}
      </div>
    </>
  )

  if (variant === 'plain') return content

  return <div className="rounded-xl border border-neutral-200 bg-white p-4">{content}</div>
}
