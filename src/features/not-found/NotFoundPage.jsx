import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        La page demandée n’existe pas.
      </p>
      <Link className="mt-4 inline-block text-blue-600 hover:underline" to="/">
        Retour à l’accueil
      </Link>
    </main>
  )
}
