import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import { useCart } from '../../hooks/useCart.js'
import { signOutUser } from '../../lib/auth.js'
import { ScrollToTop } from '../shared/ScrollToTop.jsx'
import { Badge } from '../../ui/Badge.jsx'
import { Button } from '../../ui/Button.jsx'

export function PublicLayout() {
  const cart = useCart()
  const { isAuthenticated, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  useLocation()

  return (
    <div className="min-h-dvh flex flex-col font-sans text-swiss-neutral-900 bg-swiss-neutral-50 selection:bg-medilec-accent-weak selection:text-medilec-accent">
      <ScrollToTop />

      <header className="sticky top-0 z-50 w-full border-b border-swiss-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2 focus-visible:rounded-md" to="/">
            <img alt="Médilec" src="/logo.png" className="h-8 w-auto" loading="eager" decoding="async" />
            <span className="sr-only">Médilec.ch</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium text-swiss-neutral-600">
            <Link
              className="transition-colors hover:text-medilec-accent focus-visible:rounded-md focus-visible:text-medilec-accent"
              to="/catalog"
            >
              Catalogue
            </Link>

            {isAdmin && (
              <Link
                className="transition-colors hover:text-medilec-accent focus-visible:rounded-md focus-visible:text-medilec-accent"
                to="/admin"
              >
                Admin
              </Link>
            )}

            {isAuthenticated && (
              <Link
                className="transition-colors hover:text-medilec-accent focus-visible:rounded-md focus-visible:text-medilec-accent"
                to="/my-orders"
              >
                Mes demandes
              </Link>
            )}

            <Link
              className="group relative flex items-center gap-2 transition-colors hover:text-medilec-accent focus-visible:rounded-md focus-visible:text-medilec-accent"
              to="/cart"
            >
              Panier
              {cart.count > 0 && (
                <Badge variant="brand" className="ml-1 px-1.5 py-0.5 text-[10px] leading-tight">
                  {cart.count}
                </Badge>
              )}
            </Link>

            <div className="h-4 w-px bg-swiss-neutral-200 mx-2 hidden sm:block"></div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  className="hidden sm:block transition-colors hover:text-medilec-accent focus-visible:rounded-md"
                  to="/profile"
                >
                  {user?.email || 'Compte'}
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await signOutUser()
                      navigate('/')
                    } catch {
                      // fail-soft
                    }
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Compte
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-swiss-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-swiss-neutral-500 sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Médilec.ch — Matériel médical professionnel pour la Suisse</p>
        </div>
      </footer>
    </div>
  )
}
