import { onValue, ref } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'

import { rtdb } from '../lib/db.js'

/**
 * Abonne un composant React à une valeur RTDB.
 * - Fail-soft si Firebase n’est pas configuré.
 * - Retourne { status, data, error }.
 */
export function useRtdbValue(path) {
  const [cache, setCache] = useState(() => ({}))

  const normalizedPath = useMemo(() => {
    if (typeof path !== 'string') return ''
    return path.trim().replace(/^\//, '')
  }, [path])

  const entry = normalizedPath ? cache[normalizedPath] : null
  const status = (() => {
    if (!normalizedPath) return 'idle'
    if (!rtdb) return 'not-configured'
    if (!entry) return 'loading'
    if (entry.error) return 'error'
    return 'success'
  })()

  useEffect(() => {
    if (!normalizedPath) {
      return
    }

    if (!rtdb) {
      return
    }

    const dbRef = ref(rtdb, normalizedPath)
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const value = snapshot.val()
        setCache((prev) => ({
          ...prev,
          [normalizedPath]: { data: value, error: null },
        }))
      },
      (err) => {
        setCache((prev) => ({
          ...prev,
          [normalizedPath]: { data: null, error: err },
        }))
      },
    )

    return () => unsubscribe()
  }, [normalizedPath])

  return { status, data: entry?.data ?? null, error: entry?.error ?? null }
}
