import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import { useCart } from '../../hooks/useCart.js'
import { signOutUser } from '../../lib/auth.js'
import { ScrollToTop } from '../shared/ScrollToTop.jsx'

export function PublicLayout() {
  const cart = useCart()
  const { isAuthenticated, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  useLocation()

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <ScrollToTop />

      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link className="inline-flex items-center font-semibold tracking-tight text-neutral-900" to="/">
            <img alt="Médilec" src="/logo.png" className="h-10 w-auto" loading="eager" decoding="async" />
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link className="text-neutral-700 hover:text-neutral-900" to="/catalog">
              Catalogue
            </Link>

            {isAdmin ? (
              <Link className="text-neutral-700 hover:text-neutral-900" to="/admin">
                Admin
              </Link>
            ) : null}

            {isAuthenticated ? (
              <Link className="text-neutral-700 hover:text-neutral-900" to="/my-orders">
                Mes demandes
              </Link>
            ) : null}

            <Link className="relative text-neutral-700 hover:text-neutral-900" to="/cart">
              Panier
              {cart.count > 0 ? (
                <span
                  className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: 'var(--medilec-accent)' }}
                >
                  {cart.count}
                </span>
              ) : null}
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link className="text-neutral-700 hover:text-neutral-900" to="/profile">
                  {user?.email || 'Compte'}
                </Link>
                <button
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  onClick={async () => {
                    try {
                      await signOutUser()
                      navigate('/')
                    } catch {
                      // fail-soft
                    }
                  }}
                  type="button"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                className="rounded-lg px-3 py-2 font-medium text-white"
                style={{ backgroundColor: 'var(--medilec-accent)' }}
                to="/login"
              >
                Compte
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600">
          © {new Date().getFullYear()} Médilec.ch
        </div>
      </footer>
    </div>
  )
}
