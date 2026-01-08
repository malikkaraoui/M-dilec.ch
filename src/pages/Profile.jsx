import { ref, serverTimestamp, update } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { useRtdbValue } from '../hooks/useRtdbValue.js'
import { signOutUser } from '../lib/auth.js'
import { rtdb } from '../lib/db.js'

function normalizePhone(value) {
  // MVP: on ne force pas E.164 strict, mais on nettoie.
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function looksLikePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 8
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthConfigured } = useAuth()

  const userPath = user?.uid ? `/users/${user.uid}` : null
  const { data: profileData, status: profileStatus, error: profileError } = useRtdbValue(userPath)

  const initialPhone = useMemo(() => normalizePhone(profileData?.phone || ''), [profileData?.phone])
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    setPhone(initialPhone)
  }, [initialPhone])

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

    const nextPhone = normalizePhone(phone)
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

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-600">Connecté en tant que</div>
        <div className="mt-1 font-medium">{user.email || user.uid}</div>
        <div className="mt-2 text-xs text-neutral-500">UID: {user.uid}</div>
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
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="profile-phone">
              Numéro de téléphone
            </label>
            <input
              id="profile-phone"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="+41 79 123 45 67"
            />
            <div className="text-xs text-neutral-500">
              {profileStatus === 'loading' ? 'Chargement…' : null}
            </div>
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
