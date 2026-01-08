import { get, ref, update } from 'firebase/database'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { rtdb } from '../../lib/db.js'

const DEMO_PRODUCTS = {
  'demo-oxymetre': {
    name: 'Oxymètre de pouls (doigt)',
    brand: 'Médilec',
    description: 'Mesure SpO₂ et fréquence cardiaque. Format compact, facile à utiliser.',
    priceCents: 3990,
  },
  'demo-tensiometre': {
    name: 'Tensiomètre bras automatique',
    brand: 'Médilec',
    description: 'Mesure tension artérielle + détection d’arythmie. Grand écran lisible.',
    priceCents: 7990,
  },
  'demo-thermometre': {
    name: 'Thermomètre infrarouge sans contact',
    brand: 'Médilec',
    description: 'Mesure rapide, hygiénique, idéal cabinet / domicile.',
    priceCents: 4990,
  },
  'demo-nebuliseur': {
    name: 'Nébuliseur (aérosol) compact',
    brand: 'Médilec',
    description: 'Pour traitements par inhalation. Kit de base inclus.',
    priceCents: null,
  },
  'demo-deambulateur': {
    name: 'Déambulateur pliable',
    brand: 'Médilec',
    description: 'Léger, stable, facile à plier. Idéal mobilité au quotidien.',
    priceCents: null,
  },
  'demo-fauteuil': {
    name: 'Fauteuil roulant (standard)',
    brand: 'Médilec',
    description: 'Confort standard, usage intérieur/extérieur. Options sur demande.',
    priceCents: null,
  },
}

export function AdminDashboardPage() {
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState('')
  const [seedResult, setSeedResult] = useState(null)

  async function onSeedProducts() {
    setSeedError('')
    setSeedResult(null)

    if (!rtdb) {
      setSeedError('Realtime Database non configurée (VITE_FIREBASE_DATABASE_URL).')
      return
    }

    try {
      setSeeding(true)

      const snap = await get(ref(rtdb, 'products'))
      const existing = snap.exists() && snap.val() && typeof snap.val() === 'object' ? snap.val() : {}

      const existingCount = existing && typeof existing === 'object' ? Object.keys(existing).length : 0
      const ids = Object.keys(DEMO_PRODUCTS)
      const missingIds = ids.filter((id) => !(id in existing))

      if (missingIds.length === 0) {
        setSeedResult({ added: 0, existingCount })
        return
      }

      const msg = existingCount > 0
        ? `Ajouter ${missingIds.length} produits de démo ? (n’écrase pas les produits existants)`
        : `Créer ${missingIds.length} produits de démo ?`

      const ok = window.confirm(msg)
      if (!ok) return

      const payload = {}
      for (const id of missingIds) {
        payload[id] = DEMO_PRODUCTS[id]
      }

      await update(ref(rtdb, 'products'), payload)
      setSeedResult({ added: missingIds.length, existingCount })
    } catch (err) {
      setSeedError(err?.message || 'Seed impossible.')
    } finally {
      setSeeding(false)
    }
  }

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

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Données de démo</div>
            <div className="mt-1 text-sm text-neutral-600">
              Crée des produits de démonstration (catalogue non vide). N’écrase pas l’existant.
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--medilec-accent)' }}
            onClick={onSeedProducts}
            disabled={seeding}
          >
            {seeding ? 'Création…' : 'Créer produits de démo'}
          </button>
        </div>

        {seedError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {seedError}
          </div>
        ) : null}

        {seedResult ? (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {seedResult.added > 0
              ? `OK — ${seedResult.added} produit(s) de démo ajouté(s).`
              : 'Rien à faire — les produits de démo existent déjà.'}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-neutral-500">
        Accès protégé par le claim <code className="font-mono">role="admin"</code>.
      </p>
    </section>
  )
}
