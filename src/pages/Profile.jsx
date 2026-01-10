import { ref, serverTimestamp, update } from 'firebase/database'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { PhoneInput } from '../components/PhoneInput.jsx'
import { ShippingAddressForm } from '../components/ShippingAddressForm.jsx'
import { signOutUser } from '../lib/auth.js'
import { rtdb } from '../lib/db.js'
import { dialCodeForCountry, looksLikePhone, parsePhoneParts, composePhone } from '../lib/phone.js'
import { isShippingAddressComplete } from '../lib/shippingAddress.js'
import { normalizeCountryCode } from '../lib/countries.js'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { Input } from '../ui/Input.jsx'
import { Badge } from '../ui/Badge.jsx'

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
    country: normalizeCountryCode(String(a.country || 'CH').trim() || 'CH'),
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, isAuthConfigured, role, refreshClaims, claimsLoading } = useAuth()

  const userPath = user?.uid ? `/users/${user.uid}` : null
  const { data: profileData, status: profileStatus, error: profileError } = useRtdbValue(userPath)

  const [activeTab, setActiveTab] = useState('general') // 'general', 'orders'

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
  const lastAutoDialRef = useRef('+41')
  const [savingPhone, setSavingPhone] = useState(false)
  const [savePhoneError, setSavePhoneError] = useState('')
  const [savePhoneOk, setSavePhoneOk] = useState(false)

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
    lastAutoDialRef.current = dialCodeForCountry(initialAddress?.country || 'CH')
  }, [initialAddress])

  // Phone/Country Sync Logic
  useEffect(() => {
    const country = normalizeCountryCode(shippingAddress?.country || 'CH')
    const nextAuto = dialCodeForCountry(country)
    const national = String(phoneParts?.national || '').trim()
    const dial = String(phoneParts?.dialCode || '').trim() || '+41'

    const shouldAuto = !national || dial === lastAutoDialRef.current
    if (shouldAuto && dial !== nextAuto) {
      setPhoneParts((prev) => ({
        dialCode: nextAuto,
        national: String(prev?.national || ''),
      }))
    }
    lastAutoDialRef.current = nextAuto
  }, [phoneParts.dialCode, phoneParts.national, shippingAddress?.country])

  async function onSavePhone(e) {
    e.preventDefault()
    setSavePhoneOk(false)
    setSavePhoneError('')

    if (!rtdb || !user?.uid) return
    const nextPhone = composePhone(phoneParts)
    if (!looksLikePhone(nextPhone)) {
      setSavePhoneError('Numéro invalide (8 chiffres min).')
      return
    }

    try {
      setSavingPhone(true)
      await update(ref(rtdb, `users/${user.uid}`), { phone: nextPhone, updatedAt: serverTimestamp() })
      setSavePhoneOk(true)
    } catch (err) {
      setSavePhoneError('Erreur sauvegarde.')
    } finally {
      setSavingPhone(false)
    }
  }

  async function onSaveIdentity(e) {
    e.preventDefault()
    setSaveIdentityOk(false)
    setSaveIdentityError('')

    if (!rtdb || !user?.uid) return
    const fn = normalizeText(firstName)
    const ln = normalizeText(lastName)
    if (!fn || !ln) {
      setSaveIdentityError('Prénom et nom requis.')
      return
    }

    try {
      setSavingIdentity(true)
      await update(ref(rtdb, `users/${user.uid}`), { firstName: fn, lastName: ln, updatedAt: serverTimestamp() })
      setSaveIdentityOk(true)
    } catch (err) {
      setSaveIdentityError('Erreur sauvegarde.')
    } finally {
      setSavingIdentity(false)
    }
  }

  async function onSaveAddress(e) {
    e.preventDefault()
    setSaveAddressOk(false)
    setSaveAddressError('')

    if (!rtdb || !user?.uid) return
    const next = normalizeAddress(shippingAddress)
    if (!isShippingAddressComplete(next)) {
      setSaveAddressError('Adresse incomplète.')
      return
    }

    try {
      setSavingAddress(true)
      await update(ref(rtdb, `users/${user.uid}`), { shippingAddress: next, updatedAt: serverTimestamp() })
      setSaveAddressOk(true)
    } catch (err) {
      setSaveAddressError('Erreur sauvegarde.')
    } finally {
      setSavingAddress(false)
    }
  }

  if (!isAuthConfigured || authLoading) return <div className="p-8 text-center text-swiss-neutral-500">Chargement...</div>

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold">Connexion requise</h1>
        <p className="mt-2 text-swiss-neutral-500">Veuillez vous connecter pour accéder à votre profil.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Se connecter</Button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="mb-8 border-b border-swiss-neutral-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-medilec-accent/10 flex items-center justify-center text-medilec-accent text-xl font-bold">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-swiss-neutral-900">
                {firstName || 'Utilisateur'} {lastName}
              </h1>
              <p className="text-sm text-swiss-neutral-500 shadow-sm">{user.email}</p>
            </div>
          </div>

          <Button variant="secondary" onClick={() => signOutUser().then(() => navigate('/'))}>
            Déconnexion
          </Button>
        </div>

        {role === 'admin' && (
          <div className="mt-4">
            <Badge variant="brand">Mode Administrateur</Badge>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
        {/* Sidebar */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-swiss-neutral-100 text-swiss-neutral-900' : 'text-swiss-neutral-600 hover:bg-swiss-neutral-50'}`}
          >
            Informations Générales
          </button>
          <button
            onClick={() => navigate('/my-orders')}
            className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors text-swiss-neutral-600 hover:bg-swiss-neutral-50`}
          >
            Mes Commandes
          </button>
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors text-medilec-accent hover:bg-red-50`}
            >
              Interface Admin
            </button>
          )}
        </nav>

        {/* Content */}
        <div className="space-y-6">
          {/* General Info Tab */}
          {activeTab === 'general' && (
            <>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-swiss-neutral-900">Identité</h2>
                    <p className="text-sm text-swiss-neutral-500">Mettez à jour vos informations personnelles.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-swiss-neutral-400">UID: {user.uid.slice(0, 8)}...</span>
                  </div>
                </div>

                <form onSubmit={onSaveIdentity} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {saveIdentityOk && <span className="text-green-600">Enregistré !</span>}
                      {saveIdentityError && <span className="text-red-600">{saveIdentityError}</span>}
                    </div>
                    <Button type="submit" isLoading={savingIdentity} disabled={!firstName || !lastName}>Enregistrer</Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h2 className="mb-4 text-lg font-bold text-swiss-neutral-900">Coordonnées</h2>

                <form onSubmit={onSavePhone} className="space-y-6">
                  <PhoneInput
                    label="Téléphone"
                    dialCode={phoneParts.dialCode}
                    national={phoneParts.national}
                    onChange={setPhoneParts}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {savePhoneOk && <span className="text-green-600">Enregistré !</span>}
                      {savePhoneError && <span className="text-red-600">{savePhoneError}</span>}
                    </div>
                    <Button type="submit" isLoading={savingPhone}>Sauvegarder</Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h2 className="mb-4 text-lg font-bold text-swiss-neutral-900">Adresse de livraison par défaut</h2>
                <form onSubmit={onSaveAddress} className="space-y-6">
                  <ShippingAddressForm
                    value={shippingAddress}
                    onChange={setShippingAddress}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {saveAddressOk && <span className="text-green-600">Enregistré !</span>}
                      {saveAddressError && <span className="text-red-600">{saveAddressError}</span>}
                    </div>
                    <Button type="submit" isLoading={savingAddress}>Sauvegarder l'adresse</Button>
                  </div>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
