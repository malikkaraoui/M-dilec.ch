import { Link } from 'react-router-dom'

export function AdminDashboardPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-neutral-600">
          MVP — outils internes pour gérer produits et demandes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50"
          to="/admin/products"
        >
          <div className="text-sm font-semibold text-neutral-900">Produits</div>
          <div className="mt-1 text-sm text-neutral-600">Créer / modifier / supprimer</div>
        </Link>

        <Link
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50"
          to="/admin/orders"
        >
          <div className="text-sm font-semibold text-neutral-900">Commandes</div>
          <div className="mt-1 text-sm text-neutral-600">Voir les demandes + statuts</div>
        </Link>
      </div>

      <p className="text-xs text-neutral-500">
        Accès protégé par le claim <code className="font-mono">admin=true</code>.
      </p>
    </section>
  )
}
