import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { registerEmailPassword } from '../lib/auth.js'

export function AuthRegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Veuillez renseigner un email.')
      return
    }
    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    try {
      setSubmitting(true)
      await registerEmailPassword(trimmedEmail, password)
      navigate('/profile', { replace: true })
    } catch (err) {
      setError(err?.message || 'Inscription impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
        <p className="text-sm text-neutral-600">
          Accédez au panier et envoyez vos demandes (MVP, sans paiement).
        </p>
      </header>

      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
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
          <label className="text-sm font-medium" htmlFor="register-password">
            Mot de passe
          </label>
          <input
            id="register-password"
            autoComplete="new-password"
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
          {submitting ? 'Création…' : 'Créer le compte'}
        </button>
      </form>

      <div className="text-sm text-neutral-600">
        Déjà un compte ?{' '}
        <Link className="text-blue-600 hover:underline" to="/login">
          Se connecter
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
