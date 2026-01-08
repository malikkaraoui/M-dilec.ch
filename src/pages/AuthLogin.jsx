import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { signInEmailPassword, signInWithGooglePopup } from '../lib/auth.js'

export function AuthLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, isAuthConfigured } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fromPath = location?.state?.from || '/profile'

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    navigate('/profile', { replace: true })
  }, [authLoading, user, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Veuillez renseigner un email.')
      return
    }
    if (!password) {
      setError('Veuillez renseigner un mot de passe.')
      return
    }

    try {
      setSubmitting(true)
      await signInEmailPassword(trimmedEmail, password)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(err?.message || 'Connexion impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    setError('')
    try {
      setSubmitting(true)
      await signInWithGooglePopup()
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(err?.message || 'Connexion Google impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthConfigured) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
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

  return (
    <section className="mx-auto max-w-md space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-neutral-600">Accédez à votre compte (email/mot de passe ou Google).</p>
      </header>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <button
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
          disabled={submitting}
          onClick={onGoogle}
          type="button"
        >
          {submitting ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <div className="text-xs text-neutral-500">ou</div>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="prenom.nom@exemple.ch"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-300 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>

      <div className="text-sm text-neutral-600">
        Pas encore de compte ?{' '}
        <Link className="text-blue-600 hover:underline" to="/register">
          Créer un compte
        </Link>
      </div>

      <div>
        <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/">
          Retour à l’accueil
        </Link>
      </div>
    </section>
  )
}
