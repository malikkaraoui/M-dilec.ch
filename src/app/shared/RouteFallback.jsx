export function RouteFallback({ label = 'Chargement…' }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300"
          style={{ borderTopColor: 'var(--medilec-accent)' }}
        />
        <p className="text-sm text-neutral-700">{label}</p>
      </div>
    </section>
  )
}
