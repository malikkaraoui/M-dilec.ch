import { Link } from 'react-router-dom'
import { Card } from '../../ui/Card.jsx'

export function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-swiss-neutral-900">Tableau de bord</h1>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-medilec-accent">Admin</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-swiss-lg cursor-pointer transition-shadow" onClick={() => window.location.href = '/admin/orders'}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-swiss-neutral-900">Commandes</h2>
              <p className="text-sm text-swiss-neutral-500">Gérer les demandes</p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <Link to="/admin/orders" className="text-sm font-medium text-blue-600 hover:underline">Voir liste →</Link>
          </div>
        </Card>

        <Card className="hover:shadow-swiss-lg cursor-pointer transition-shadow" onClick={() => window.location.href = '/admin/products'}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-swiss-neutral-900">Produits</h2>
              <p className="text-sm text-swiss-neutral-500">Catalogue & Stocks</p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <Link to="/admin/products" className="text-sm font-medium text-purple-600 hover:underline">Gérer →</Link>
          </div>
        </Card>

        <Card className="hover:shadow-swiss-lg cursor-pointer transition-shadow" onClick={() => window.location.href = '/admin/carts'}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-swiss-neutral-900">Paniers</h2>
              <p className="text-sm text-swiss-neutral-500">Paniers actifs</p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <Link to="/admin/carts" className="text-sm font-medium text-orange-600 hover:underline">Inspecter →</Link>
          </div>
        </Card>

        <Card className="hover:shadow-swiss-lg cursor-pointer transition-shadow" onClick={() => window.location.href = '/admin/products/new'}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-swiss-neutral-900">Nouveau Produit</h2>
              <p className="text-sm text-swiss-neutral-500">Ajouter au catalogue</p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <Link to="/admin/products/new" className="text-sm font-medium text-emerald-600 hover:underline">Créer →</Link>
          </div>
        </Card>
      </div>
    </section>
  )
}
