import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'

import { auth, isAuthConfigured } from '../lib/auth.js'

export function useAuth() {
  const [state, setState] = useState(() => ({
    user: null,
    loading: isAuthConfigured,
    error: null,
  }))

  useEffect(() => {
    if (!isAuthConfigured) return undefined

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setState({ user: nextUser, loading: false, error: null })
      },
      (err) => {
        setState({ user: null, loading: false, error: err })
      },
    )

    return unsubscribe
  }, [])

  const isAuthenticated = Boolean(state.user)

  return useMemo(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      isAuthenticated,
      isAuthConfigured,
    }),
    [state.user, state.loading, state.error, isAuthenticated],
  )
}
