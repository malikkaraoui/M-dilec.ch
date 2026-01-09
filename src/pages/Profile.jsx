import { ref, serverTimestamp, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { PhoneInput } from '../components/PhoneInput.jsx'
import { ShippingAddressForm } from '../components/ShippingAddressForm.jsx'
import { signOutUser } from '../lib/auth.js'
import { rtdb } from '../lib/db.js'
import { composePhone, looksLikePhone, parsePhoneParts } from '../lib/phone.js'
import { isShippingAddressComplete } from '../lib/shippingAddress.js'

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeAddress(value) {
  const a = value && typeof value === 'object' ? value : {}
  return {
    name: String(a.name || '').trim(),
    street: String(a.street || '').trim(),
    streetNo: String(a.streetNo || '').trim(),
    postalCode: String(a.postalCode || '').trim(),
    city: String(a.city || '').trim(),
    country: String(a.country || 'CH').trim() || 'CH',
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, isAuthConfigured, role, refreshClaims, claimsLoading } = useAuth()

  const userPath = user?.uid ? `/users/${user.uid}` : null
  const { data: profileData, status: profileStatus, error: profileError } = useRtdbValue(userPath)

  const initialFirstName = useMemo(() => normalizeText(profileData?.firstName || ''), [profileData?.firstName])
  const initialLastName = useMemo(() => normalizeText(profileData?.lastName || ''), [profileData?.lastName])
  const initialPhoneParts = useMemo(() => parsePhoneParts(profileData?.phone || ''), [profileData?.phone])
  const initialAddress = useMemo(
    () => normalizeAddress(profileData?.shippingAddress || {}),
    [profileData?.shippingAddress],
  )

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [saveIdentityError, setSaveIdentityError] = useState('')
  const [saveIdentityOk, setSaveIdentityOk] = useState(false)

  const [phoneParts, setPhoneParts] = useState(() => ({ dialCode: '+41', national: '' }))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  const [shippingAddress, setShippingAddress] = useState(() => ({
    name: '',
    street: '',
    streetNo: '',
    postalCode: '',
    city: '',
    country: 'CH',
  }))
  const [savingAddress, setSavingAddress] = useState(false)
  const [saveAddressError, setSaveAddressError] = useState('')
  const [saveAddressOk, setSaveAddressOk] = useState(false)

  useEffect(() => {
    setFirstName(initialFirstName)
    setLastName(initialLastName)
  }, [initialFirstName, initialLastName])

  useEffect(() => {
    setPhoneParts(initialPhoneParts)
  }, [initialPhoneParts])

  useEffect(() => {
    setShippingAddress(initialAddress)
  }, [initialAddress])

  async function onSavePhone(e) {
    e.preventDefault()
    setSaveOk(false)
    setSaveError('')

    if (!user?.uid) return
    if (!rtdb) {
      setSaveError(
        'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
      )
      return
    }

    const nextPhone = composePhone(phoneParts)
    if (!looksLikePhone(nextPhone)) {
      setSaveError('Numéro invalide (au moins 8 chiffres).')
      return
    }

    try {
      setSaving(true)
      await update(ref(rtdb, `users/${user.uid}`), {
        email: user.email || null,
        phone: nextPhone,
        updatedAt: serverTimestamp(),
      })
      setSaveOk(true)
    } catch (err) {
      setSaveError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveIdentity(e) {
    e.preventDefault()
    setSaveIdentityOk(false)
    setSaveIdentityError('')

    if (!user?.uid) return
    if (!rtdb) {
      setSaveIdentityError(
        'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
      )
      return
    }

    const fn = normalizeText(firstName)
    const ln = normalizeText(lastName)
    if (!fn || !ln) {
      setSaveIdentityError('Veuillez renseigner votre prénom et votre nom.')
      return
    }

    try {
      setSavingIdentity(true)
      await update(ref(rtdb, `users/${user.uid}`), {
        email: user.email || null,
        firstName: fn,
        lastName: ln,
        updatedAt: serverTimestamp(),
      })
      setSaveIdentityOk(true)
    } catch (err) {
      setSaveIdentityError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSavingIdentity(false)
    }
  }

  async function onSaveAddress(e) {
    e.preventDefault()
    setSaveAddressOk(false)
    setSaveAddressError('')

    if (!user?.uid) return
    if (!rtdb) {
      setSaveAddressError(
        'Realtime Database non configurée. Vérifiez VITE_FIREBASE_DATABASE_URL dans `.env.local`.',
      )
      return
    }

    const next = normalizeAddress(shippingAddress)
    if (!isShippingAddressComplete(next)) {
      setSaveAddressError('Veuillez compléter tous les champs de l’adresse de livraison.')
      return
    }

    try {
      setSavingAddress(true)
      await update(ref(rtdb, `users/${user.uid}`), {
        email: user.email || null,
        shippingAddress: next,
        updatedAt: serverTimestamp(),
      })
      setSaveAddressOk(true)
    } catch (err) {
      setSaveAddressError(err?.message || 'Enregistrement impossible.')
    } finally {
      setSavingAddress(false)
    }
  }

  async function onSignOut() {
    await signOutUser()
    navigate('/', { replace: true })
  }

  if (!isAuthConfigured) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Compte</h1>
        <p className="text-sm text-neutral-600">
          L’authentification Firebase n’est pas configurée sur cet environnement.
        </p>
        <p className="text-sm text-neutral-600">
          Ajoutez vos variables dans <code className="rounded bg-neutral-100 px-1">.env.local</code> (voir{' '}
          <code className="rounded bg-neutral-100 px-1">.env.example</code>).
        </p>
        <Link className="text-sm text-blue-600 hover:underline" to="/">
          Retour à l’accueil
        </Link>
      </section>
    )
  }

  if (authLoading) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Compte</h1>
        <p className="text-sm text-neutral-600">Chargement…</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Compte</h1>
        <p className="text-sm text-neutral-600">Vous n’êtes pas connecté.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            to="/login"
          >
            Se connecter
          </Link>
          <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mon compte</h1>
        <p className="text-sm text-neutral-600">Gérez vos informations et vos demandes (MVP).</p>
      </header>

      {location?.state?.reason === 'phone-required' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Pour envoyer une demande depuis le panier, nous avons besoin de votre numéro de téléphone.
        </div>
      ) : null}

      {location?.state?.reason === 'address-required' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Pour envoyer une demande depuis le panier, veuillez renseigner votre adresse de livraison.
        </div>
      ) : null}

      {!isShippingAddressComplete(profileData?.shippingAddress) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Astuce: complétez votre <span className="font-medium">adresse de livraison</span> pour pouvoir envoyer
          une demande rapidement depuis le panier.
        </div>
      ) : null}

      {!String(profileData?.firstName || '').trim() || !String(profileData?.lastName || '').trim() ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Astuce: renseignez votre <span className="font-medium">prénom</span> et votre{' '}
          <span className="font-medium">nom</span>.
        </div>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-600">Connecté en tant que</div>
        <div className="mt-1 font-medium">{user.email || user.uid}</div>
        <div className="mt-2 text-xs text-neutral-500">UID: {user.uid}</div>


        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-700">
            Rôle:{' '}
            <span className="font-mono text-xs">{role ? `role="${role}"` : 'role=(absent)'}</span>
          </div>
          <button
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
            onClick={async () => {
              try {
                await refreshClaims()
              } catch {
                // fail-soft
              }
            }}
            disabled={claimsLoading}
            type="button"
          >
            {claimsLoading ? 'Rafraîchissement…' : 'Rafraîchir mes droits'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-semibold">Identité</h2>
        <p className="mt-1 text-sm text-neutral-600">Votre prénom et votre nom.</p>

        <form className="mt-4 space-y-3" onSubmit={onSaveIdentity}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="profile-firstName">
                Prénom
              </label>
              <input
                id="profile-firstName"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                type="text"
                autoComplete="given-name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="profile-lastName">
                Nom
              </label>
              <input
                id="profile-lastName"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                type="text"
                autoComplete="family-name"
              />
            </div>
          </div>

          {saveIdentityError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveIdentityError}
            </div>
          ) : null}

          {saveIdentityOk ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Identité enregistrée.
            </div>
          ) : null}

          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            disabled={savingIdentity}
            type="submit"
          >
            {savingIdentity ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-semibold">Téléphone</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Nous en aurons besoin pour vous recontacter lors d’une demande.
        </p>

        {profileError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Lecture profil: {profileError?.message || 'Erreur'}
          </div>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={onSavePhone}>
          <PhoneInput
            idPrefix="profile-phone"
            label="Numéro de téléphone"
            dialCode={phoneParts.dialCode}
            national={phoneParts.national}
            onChange={setPhoneParts}
            placeholder="79 123 45 67"
          />
            <div className="text-xs text-neutral-500">
              {profileStatus === 'loading' ? 'Chargement…' : null}
            </div>

          {saveError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}

          {saveOk ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Téléphone enregistré.
            </div>
          ) : null}

          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            disabled={saving}
            type="submit"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <form onSubmit={onSaveAddress}>
        <ShippingAddressForm
          value={shippingAddress}
          onChange={setShippingAddress}
          description="Adresse utilisée pour la livraison (si nécessaire)."
        />

        {saveAddressError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveAddressError}
          </div>
        ) : null}

        {saveAddressOk ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Adresse enregistrée.
          </div>
        ) : null}

        <button
          className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--medilec-accent)' }}
          disabled={savingAddress}
          type="submit"
        >
          {savingAddress ? 'Enregistrement…' : 'Enregistrer l’adresse'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          onClick={onSignOut}
          type="button"
        >
          Se déconnecter
        </button>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/catalog">
          Aller au catalogue
        </Link>
      </div>
    </section>
  )
}
