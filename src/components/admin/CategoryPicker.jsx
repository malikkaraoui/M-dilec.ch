import { useMemo, useState } from 'react'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function uniqNumbers(list) {
  const out = []
  const seen = new Set()
  for (const x of Array.isArray(list) ? list : []) {
    const n = Number(x)
    if (!Number.isFinite(n)) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/**
 * Sélecteur de catégories (1 min / max paramétrable) plus ergonomique qu'un <select multiple>.
 */
export function CategoryPicker({
  options,
  value,
  onChange,
  disabled,
  max = 5,
  min = 1,
  label = 'Catégories',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => uniqNumbers(value), [value])

  const filtered = useMemo(() => {
    const list = Array.isArray(options) ? options : []
    const q = normalizeText(query)
    if (!q) return list
    return list.filter((o) => normalizeText(o?.label).includes(q))
  }, [options, query])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const selectedLabels = useMemo(() => {
    const list = Array.isArray(options) ? options : []
    const byId = new Map(list.map((o) => [Number(o?.id), String(o?.label || '')]))
    return selected
      .map((id) => ({ id, label: byId.get(Number(id)) || String(id) }))
      .filter((x) => x.label)
  }, [options, selected])

  function toggle(id) {
    if (disabled) return
    const n = Number(id)
    if (!Number.isFinite(n)) return

    if (selectedSet.has(n)) {
      onChange(selected.filter((x) => x !== n))
      return
    }

    if (selected.length >= max) return
    onChange([...selected, n])
  }

  return (
    <div className="block">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{label} *</div>
          <div className="mt-1 text-xs text-neutral-600">
            Sélection: {selected.length} / {max} (min {min}).
          </div>
        </div>
      </div>

      <details
        className="relative mt-2"
        open={open && !disabled}
        onToggle={(e) => {
          // En mode disabled, on force fermé.
          const next = Boolean(e.currentTarget.open)
          setOpen(disabled ? false : next)
        }}
      >
        <summary
          className={
            disabled
              ? 'list-none cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600'
              : 'list-none cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50'
          }
          onClick={(e) => {
            // Empêche la navigation (Safari) et gère l’état nous-mêmes.
            e.preventDefault()
            if (disabled) return
            setOpen((v) => !v)
          }}
        >
          {selectedLabels.length ? (
            <span>
              {selectedLabels.length === 1
                ? selectedLabels[0].label
                : `${selectedLabels.length} catégories sélectionnées`}
            </span>
          ) : (
            <span className="text-neutral-500">Choisir des catégories…</span>
          )}
        </summary>

        <div className="absolute z-20 mt-2 w-full rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <input
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une catégorie…"
            disabled={disabled}
            autoFocus
          />

          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-neutral-200 p-2">
            {filtered.length ? (
              <ul className="space-y-1">
                {filtered.map((c) => {
                  const id = Number(c?.id)
                  const checked = selectedSet.has(id)
                  const cantAdd = !checked && selected.length >= max
                  return (
                    <li key={String(c?.id)}>
                      <label
                        className={
                          cantAdd
                            ? 'flex cursor-not-allowed items-start gap-2 text-sm text-neutral-400'
                            : 'flex cursor-pointer items-start gap-2 text-sm'
                        }
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          disabled={disabled || cantAdd}
                          onChange={() => toggle(id)}
                        />
                        <span>{c?.label}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="text-sm text-neutral-600">Aucune catégorie.</div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
            <div>
              {selectedLabels.length
                ? selectedLabels.slice(0, 2).map((x) => x.label).join(', ') + (selectedLabels.length > 2 ? ', …' : '')
                : 'Aucune catégorie sélectionnée.'}
            </div>
            <button
              type="button"
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      </details>

      {selected.length < min ? (
        <div className="mt-1 text-xs text-red-700">Choisissez au moins {min} catégorie.</div>
      ) : null}

      {selected.length >= max ? (
        <div className="mt-1 text-xs text-neutral-600">Maximum atteint: {max} catégories.</div>
      ) : null}
    </div>
  )
}
