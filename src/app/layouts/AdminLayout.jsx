import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import { useCart } from '../../hooks/useCart.js'
import { signOutUser } from '../../lib/auth.js'

export function AdminLayout() {
  const navigate = useNavigate()
  const cart = useCart()
  const { user } = useAuth()

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link className="font-semibold tracking-tight" to="/">
              Médilec.ch
            </Link>
            <span className="text-sm text-neutral-500">Admin</span>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin">
              Dashboard
            </Link>
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin/products">
              Produits
            </Link>
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin/orders">
              Commandes
            </Link>
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin/carts">
              Paniers
            </Link>

            <span className="mx-1 hidden h-5 w-px bg-neutral-200 sm:inline" aria-hidden="true" />

            <Link className="text-neutral-700 hover:text-neutral-900" to="/catalog">
              Voir le site
            </Link>
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
            <Link className="text-neutral-700 hover:text-neutral-900" to="/profile">
              {user?.email || 'Profil'}
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
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
