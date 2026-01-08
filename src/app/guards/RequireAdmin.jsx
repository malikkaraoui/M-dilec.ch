import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'

export function RequireAdmin() {
  const location = useLocation()
  const {
    isAuthConfigured,
    isAuthenticated,
    isAdmin,
    role,
    loading: authLoading,
    claimsLoading,
    claimsError,
    refreshClaims,
  } = useAuth()

  if (!isAuthConfigured) {
    return (
      <section className="mx-auto max-w-2xl space-y-3 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-neutral-600">
          L’authentification Firebase n’est pas configurée sur cet environnement.
        </p>
        <Link className="text-sm text-blue-600 hover:underline" to="/">
          Retour au site
        </Link>
      </section>
    )
  }

  if (authLoading || claimsLoading) {
    return (
      <section className="mx-auto max-w-2xl space-y-2 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-neutral-600">Vérification des accès…</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (claimsError) {
    return (
      <section className="mx-auto max-w-2xl space-y-3 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossible de vérifier vos droits admin.
          <div className="mt-2 font-mono text-xs text-red-700">
            {String(claimsError?.message || claimsError)}
          </div>
        </div>
        <Link className="text-sm text-blue-600 hover:underline" to="/">
          Retour au site
        </Link>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-2xl space-y-3 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Accès refusé</h1>
        <p className="text-sm text-neutral-600">
          Cette zone est réservée à l’administration.
        </p>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          <div>
            Rôle actuel:{' '}
            <span className="font-mono text-xs">{role ? `role="${role}"` : 'role=(absent)'}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Si vous venez juste d’attribuer le rôle admin, rafraîchissez vos droits (token) ou reconnectez-vous.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
              onClick={async () => {
                try {
                  await refreshClaims()
                } catch {
                  // fail-soft
                }
              }}
              disabled={claimsLoading}
            >
              {claimsLoading ? 'Rafraîchissement…' : 'Rafraîchir mes droits'}
            </button>
            <Link className="text-sm text-neutral-700 hover:text-neutral-900" to="/profile">
              Ouvrir mon compte
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            to="/"
          >
            Retour à l’accueil
          </Link>
        </div>
      </section>
    )
  }

  return <Outlet />
}
