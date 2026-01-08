import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import { useCart } from '../../hooks/useCart.js'
import { ScrollToTop } from '../shared/ScrollToTop.jsx'

export function PublicLayout() {
  const cart = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const qFromUrl = location.pathname.startsWith('/catalog')
    ? new URLSearchParams(location.search).get('q') || ''
    : ''

  function onSubmitSearch(e) {
    e.preventDefault()

    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('q') || '').trim()
    if (!q) {
      navigate('/catalog')
      return
    }

    const encoded = encodeURIComponent(q)
    navigate(`/catalog?q=${encoded}`)
  }

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <ScrollToTop />

      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[auto,1fr,auto]">
          <Link className="font-semibold tracking-tight text-neutral-900" to="/">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--medilec-accent)' }}
              />
              Médilec.ch
            </span>
          </Link>

          <div className="sm:px-3">
            <form className="relative" onSubmit={onSubmitSearch}>
              <label className="sr-only" htmlFor="site-search">
                Rechercher un produit
              </label>
              <input
                key={location.pathname.startsWith('/catalog') ? location.search : 'no-q'}
                id="site-search"
                name="q"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2"
                style={{ boxShadow: '0 0 0 0 transparent', '--tw-ring-color': 'rgba(213, 43, 30, 0.18)' }}
                placeholder="Rechercher (marque, modèle, année…)"
                type="search"
                defaultValue={qFromUrl}
              />

              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                type="submit"
                aria-label="Rechercher"
                title="Rechercher"
              >
                ↵
              </button>
            </form>
          </div>

          <nav className="flex items-center justify-end gap-4 text-sm">
            <Link className="text-neutral-700 hover:text-neutral-900" to="/catalog">
              Catalogue
            </Link>

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
            <Link
              className="rounded-lg px-3 py-2 font-medium text-white"
              style={{ backgroundColor: 'var(--medilec-accent)' }}
              to={isAuthenticated ? '/profile' : '/login'}
            >
              Compte
            </Link>
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
