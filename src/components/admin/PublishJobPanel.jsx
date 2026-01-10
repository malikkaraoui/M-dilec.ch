import { useEffect, useMemo, useRef, useState } from 'react'

import { getCatalogJob, getCatalogJobLog } from '../../lib/catalogPublisher.js'

export function PublishJobPanel({ jobId, onDone }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [log, setLog] = useState('')

  const doneRef = useRef(false)

  const status = state?.status || 'queued'
  const progress = Number.isFinite(state?.progress) ? state.progress : 0
  const lastLog = String(state?.last_log || '')

  const isDone = status === 'success' || status === 'error'

  const title = useMemo(() => {
    if (!jobId) return 'Publication'
    if (status === 'success') return 'Publication terminée'
    if (status === 'error') return 'Publication en erreur'
    return 'Publication en cours…'
  }, [jobId, status])

  useEffect(() => {
    if (!jobId) return

    let cancelled = false

    async function tick() {
      try {
        setError('')
        const s = await getCatalogJob(jobId)
        if (cancelled) return
        setState(s)

        // On récupère le log complet seulement en fin (ou si erreur)
        if (s?.status === 'error' || s?.status === 'success') {
          const full = await getCatalogJobLog(jobId)
          if (!cancelled) setLog(String(full || ''))
        }

      } catch (e) {
        if (cancelled) return
        setError(String(e?.message || e))
      }
    }

    tick()
    const t = window.setInterval(tick, 500)

    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    if (!isDone) return
    if (doneRef.current) return

    // Marque done + callback
    doneRef.current = true
    onDone?.(state)
  }, [jobId, isDone, onDone, state])

  if (!jobId) return null

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <div className="text-xs text-neutral-500 font-mono">jobId={jobId}</div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>Status: <span className="font-mono">{status}</span></span>
          <span className="font-mono">{Math.max(0, Math.min(100, progress))}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-2 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: 'var(--medilec-accent)' }}
          />
        </div>
        {lastLog ? <div className="mt-2 text-xs text-neutral-700">{lastLog}</div> : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div>
      ) : null}

      {status === 'error' && state?.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <div className="font-medium">{state.error.code}</div>
          <div className="mt-1">{state.error.message}</div>
        </div>
      ) : null}

      {log ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-700">Logs</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">{log}</pre>
        </details>
      ) : null}
    </section>
  )
}
