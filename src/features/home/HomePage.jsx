import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium" style={{ color: 'var(--medilec-accent)' }}>
          Matériel médical — Suisse
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          Catalogue clair. Panier simple. Devis rapide.
        </h1>
        <p className="mt-3 text-base text-neutral-600">
          Ajoutez vos produits au panier, puis envoyez votre demande : nous vous recontactons pour valider votre
          besoin et finaliser la commande.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            to="/catalog"
          >
            Voir le catalogue
          </Link>
          <Link
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            to="/cart"
          >
            Ouvrir le panier
          </Link>
        </div>
      </div>

      <aside className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">MVP — Prochaines étapes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          <li>Recherche + filtres (URLs partageables)</li>
          <li>Connexion (email + Google)</li>
          <li>Panier localStorage + envoi à Alain</li>
          <li>Admin sécurisé (/admin)</li>
        </ul>
      </aside>
    </section>
  )
}
