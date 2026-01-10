import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { searchChAddresses, searchChZipCities, validateChPostalCity } from '../lib/chAddressApi.js'
import { SUPPORTED_COUNTRIES, normalizeCountryCode } from '../lib/countries.js'
import { searchEuAddresses, searchEuZipCities } from '../lib/euAddressApi.js'

const SUPPORTED_COUNTRY_CODES = SUPPORTED_COUNTRIES.map((c) => c.code)

function toInput(v) {
  // IMPORTANT: ne pas trim pendant la saisie, sinon on ne peut pas taper d'espaces
  // (le " " en fin de champ est immédiatement supprimé).
  return String(v ?? '')
}

function toTrim(v) {
  return String(v ?? '').trim()
}

export function ShippingAddressForm({
  value,
  onChange,
  title = 'Adresse de livraison',
  description,
  requiredNotice,
  variant = 'card',
}) {
  const raw = value && typeof value === 'object' ? value : {}
  const v = {
    name: toInput(raw.name),
    street: toInput(raw.street),
    streetNo: toInput(raw.streetNo),
    postalCode: toInput(raw.postalCode),
    city: toInput(raw.city),
    country: toInput(raw.country),
  }

  const country = normalizeCountryCode(toTrim(v.country) || 'CH')

  const [streetQuery, setStreetQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSug, setLoadingSug] = useState(false)
  const [sugError, setSugError] = useState('')

  const [streetFocused, setStreetFocused] = useState(false)
  const streetBlurTimerRef = useRef(null)

  const [zipCityQuery, setZipCityQuery] = useState('')
  const [zipCitySuggestions, setZipCitySuggestions] = useState([])
  const [loadingZipCity, setLoadingZipCity] = useState(false)
  const [zipCitySugError, setZipCitySugError] = useState('')
  const [zipCitySource, setZipCitySource] = useState('') // 'postal' | 'city'

  const [zipCityFocused, setZipCityFocused] = useState('') // 'postal' | 'city' | ''
  const zipCityBlurTimerRef = useRef(null)

  const [zipCityError, setZipCityError] = useState('')

  const abortRef = useRef(null)
  const abortZipCityRef = useRef(null)

  const canAutocomplete = SUPPORTED_COUNTRY_CODES.includes(country)

  const patch = useCallback(
    (nextPartial) => {
      onChange?.({
        name: toInput(v.name),
        street: toInput(v.street),
        streetNo: toInput(v.streetNo),
        postalCode: toInput(v.postalCode),
        city: toInput(v.city),
        country: toInput(country),
        ...nextPartial,
      })
    },
    [onChange, v.name, v.street, v.streetNo, v.postalCode, v.city, country],
  )

  const streetSearchText = useMemo(() => {
    const street = toTrim(streetQuery)
    const pc = toTrim(v.postalCode)
    const city = toTrim(v.city)

    // On essaye de restreindre la recherche si CP/Ville connus.
    const tail = [pc, city].filter(Boolean).join(' ')
    return tail ? `${street}, ${tail}` : street
  }, [streetQuery, v.postalCode, v.city])

  useEffect(() => {
    if (!canAutocomplete) return
    if (!streetFocused) return

    const q = toTrim(streetQuery)
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

        const res =
          country === 'CH'
            ? await searchChAddresses({
                searchText: streetSearchText,
                limit: 6,
                signal: controller.signal,
              })
            : await searchEuAddresses({
                searchText: streetSearchText,
                countryCodes: [country],
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
  }, [canAutocomplete, country, streetFocused, streetQuery, streetSearchText])

  // Suggestions CP/Ville (vice-versa)
  useEffect(() => {
    if (!canAutocomplete) return
    if (!zipCityFocused) return

    const q = toTrim(zipCityQuery)
    if (q.length < 2) {
      setZipCitySuggestions([])
      setZipCitySugError('')
      return
    }

    setZipCitySugError('')
    setLoadingZipCity(true)

    const t = window.setTimeout(async () => {
      try {
        abortZipCityRef.current?.abort?.()
        const controller = new AbortController()
        abortZipCityRef.current = controller

        const res =
          country === 'CH'
            ? await searchChZipCities({ searchText: q, limit: 10, signal: controller.signal })
            : await searchEuZipCities({
                searchText: q,
                countryCodes: [country],
                limit: 10,
                signal: controller.signal,
              })

        setZipCitySuggestions(res)
      } catch (e) {
        if (String(e?.name) === 'AbortError') return
        setZipCitySugError('Suggestions indisponibles.')
        setZipCitySuggestions([])
      } finally {
        setLoadingZipCity(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(t)
      abortZipCityRef.current?.abort?.()
    }
  }, [canAutocomplete, country, zipCityFocused, zipCityQuery, zipCitySource])

  function closeStreetSuggestionsSoon() {
    if (streetBlurTimerRef.current) window.clearTimeout(streetBlurTimerRef.current)
    streetBlurTimerRef.current = window.setTimeout(() => {
      setSuggestions([])
      setSugError('')
      setLoadingSug(false)
      setStreetQuery('')
    }, 120)
  }

  function closeZipCitySuggestionsSoon() {
    if (zipCityBlurTimerRef.current) window.clearTimeout(zipCityBlurTimerRef.current)
    zipCityBlurTimerRef.current = window.setTimeout(() => {
      setZipCitySuggestions([])
      setZipCitySugError('')
      setLoadingZipCity(false)
      setZipCityQuery('')
      setZipCitySource('')
      setZipCityFocused('')
    }, 120)
  }

  async function onBlurPostalOrCity() {
    if (!canAutocomplete) return

    // On replie l'autocomplétion en sortant du champ pour éviter de bloquer la saisie.
    closeZipCitySuggestionsSoon()

    // La validation actuelle est spécifique à la Suisse.
    if (country !== 'CH') {
      setZipCityError('')
      return
    }

    // Fail-soft : on n'empêche pas la saisie, mais on affiche un message si incohérent.
    try {
      const controller = new AbortController()
      const res = await validateChPostalCity({
        postalCode: toTrim(v.postalCode),
        city: toTrim(v.city),
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
            value={toInput(v.name)}
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
              value={toInput(v.street)}
              onChange={(e) => {
                patch({ street: e.target.value })
                setStreetQuery(e.target.value)
              }}
              onFocus={(e) => {
                setStreetFocused(true)
                if (streetBlurTimerRef.current) window.clearTimeout(streetBlurTimerRef.current)
                setStreetQuery(e.target.value)
              }}
              onBlur={() => {
                setStreetFocused(false)
                closeStreetSuggestionsSoon()
              }}
              placeholder="Rue de la Gare"
              type="text"
              autoComplete="street-address"
            />

            {canAutocomplete && streetFocused && (loadingSug || suggestions.length > 0 || sugError) ? (
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
                              street: s.street || toTrim(v.street),
                              streetNo: s.streetNo || toTrim(v.streetNo),
                              postalCode: s.postalCode || toTrim(v.postalCode),
                              city: s.city || toTrim(v.city),
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
              value={toInput(v.streetNo)}
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
            <div className="relative">
              <input
                id="ship-postal"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                value={toInput(v.postalCode)}
                onChange={(e) => {
                  patch({ postalCode: e.target.value })
                  setZipCitySource('postal')
                  setZipCityQuery(e.target.value)
                }}
                onFocus={(e) => {
                  if (zipCityBlurTimerRef.current) window.clearTimeout(zipCityBlurTimerRef.current)
                  setZipCityFocused('postal')
                  setZipCitySource('postal')
                  setZipCityQuery(e.target.value)
                }}
                onBlur={onBlurPostalOrCity}
                placeholder={country === 'CH' ? '1000' : 'Code postal'}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
              />

              {canAutocomplete && zipCityFocused === 'postal' && zipCitySource === 'postal' && (loadingZipCity || zipCitySuggestions.length > 0 || zipCitySugError) ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                  {zipCitySugError ? <div className="px-3 py-2 text-xs text-neutral-600">{zipCitySugError}</div> : null}
                  {loadingZipCity ? <div className="px-3 py-2 text-xs text-neutral-600">Suggestions…</div> : null}
                  {!loadingZipCity && zipCitySuggestions.length > 0 ? (
                    <ul className="max-h-56 overflow-auto py-1">
                      {zipCitySuggestions.map((s, idx) => (
                        <li key={`${s.label}-${idx}`}>
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              patch({
                                postalCode: s.postalCode || toTrim(v.postalCode),
                                city: s.city || toTrim(v.city),
                                country: country,
                              })
                              setZipCitySuggestions([])
                              setZipCityQuery('')
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
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ship-city">
              Ville
            </label>
            <div className="relative">
              <input
                id="ship-city"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                value={toInput(v.city)}
                onChange={(e) => {
                  patch({ city: e.target.value })
                  setZipCitySource('city')
                  setZipCityQuery(e.target.value)
                }}
                onFocus={(e) => {
                  if (zipCityBlurTimerRef.current) window.clearTimeout(zipCityBlurTimerRef.current)
                  setZipCityFocused('city')
                  setZipCitySource('city')
                  setZipCityQuery(e.target.value)
                }}
                onBlur={onBlurPostalOrCity}
                placeholder={country === 'CH' ? 'Lausanne' : 'Ville'}
                type="text"
                autoComplete="address-level2"
              />

              {canAutocomplete &&
              zipCityFocused === 'city' &&
              zipCitySource === 'city' &&
              (loadingZipCity || zipCitySuggestions.length > 0 || zipCitySugError) ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                  {zipCitySugError ? <div className="px-3 py-2 text-xs text-neutral-600">{zipCitySugError}</div> : null}
                  {loadingZipCity ? <div className="px-3 py-2 text-xs text-neutral-600">Suggestions…</div> : null}
                  {!loadingZipCity && zipCitySuggestions.length > 0 ? (
                    <ul className="max-h-56 overflow-auto py-1">
                      {zipCitySuggestions.map((s, idx) => (
                        <li key={`${s.label}-${idx}`}>
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              patch({
                                postalCode: s.postalCode || toTrim(v.postalCode),
                                city: s.city || toTrim(v.city),
                                country: country,
                              })
                              setZipCitySuggestions([])
                              setZipCityQuery('')
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
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="ship-country">
            Pays
          </label>
          <select
            id="ship-country"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
            style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
            value={country}
            onChange={(e) => {
              const next = normalizeCountryCode(e.target.value)
              patch({ country: next })
              // Reset soft des suggestions quand on change de pays.
              setSuggestions([])
              setStreetQuery('')
              setZipCitySuggestions([])
              setZipCityQuery('')
              setZipCityError('')
            }}
            autoComplete="country"
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <div className="text-xs text-neutral-500">
            Autocomplétion activée pour {SUPPORTED_COUNTRIES.map((c) => c.code).join(', ')}.
          </div>
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
