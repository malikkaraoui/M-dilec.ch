import { Link, Outlet } from 'react-router-dom'

export function AdminLayout() {
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

          <nav className="flex items-center gap-4 text-sm">
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin">
              Dashboard
            </Link>
            <Link className="text-neutral-700 hover:text-neutral-900" to="/admin/orders">
              Commandes
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
