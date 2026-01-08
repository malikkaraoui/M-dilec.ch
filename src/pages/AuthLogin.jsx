import { Link } from 'react-router-dom'

export function AuthLoginPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
      <p className="text-sm text-neutral-600">
        Placeholder MVP — l’auth Firebase (email + Google) arrive ensuite.
      </p>

      <div>
        <Link className="text-sm text-blue-600 hover:underline" to="/">
          Retour à l’accueil
        </Link>
      </div>
    </section>
  )
}
