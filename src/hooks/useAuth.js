import { onIdTokenChanged } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'

import { auth, isAuthConfigured } from '../lib/auth.js'

export function useAuth() {
  const [state, setState] = useState(() => ({
    user: null,
    loading: isAuthConfigured,
    error: null,
    claims: null,
    claimsLoading: false,
    claimsError: null,
  }))

  useEffect(() => {
    if (!isAuthConfigured) return undefined

    let cancelled = false

    const unsubscribe = onIdTokenChanged(
      auth,
      async (nextUser) => {
        if (cancelled) return

        // Toujours pousser l'état "auth" rapidement, puis les claims après.
        if (!nextUser) {
          setState({
            user: null,
            loading: false,
            error: null,
            claims: null,
            claimsLoading: false,
            claimsError: null,
          })
          return
        }

        setState((prev) => ({
          ...prev,
          user: nextUser,
          loading: false,
          error: null,
          claims: null,
          claimsLoading: true,
          claimsError: null,
        }))

        try {
          const tokenResult = await nextUser.getIdTokenResult()
          if (cancelled) return
          setState((prev) => ({
            ...prev,
            user: nextUser,
            loading: false,
            error: null,
            claims: tokenResult?.claims || null,
            claimsLoading: false,
            claimsError: null,
          }))
        } catch (err) {
          if (cancelled) return
          setState((prev) => ({
            ...prev,
            user: nextUser,
            loading: false,
            error: null,
            claims: null,
            claimsLoading: false,
            claimsError: err,
          }))
        }
      },
      (err) => {
        if (cancelled) return
        setState({
          user: null,
          loading: false,
          error: err,
          claims: null,
          claimsLoading: false,
          claimsError: null,
        })
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const isAuthenticated = Boolean(state.user)
  const role = state.claims && typeof state.claims.role === 'string' ? state.claims.role : ''
  const isAdmin = role === 'admin'

  return useMemo(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      isAuthenticated,
      isAuthConfigured,
      claims: state.claims,
      claimsLoading: state.claimsLoading,
      claimsError: state.claimsError,
      role,
      isAdmin,
      async refreshClaims() {
        if (!state.user) return
        try {
          setState((prev) => ({
            ...prev,
            claimsLoading: true,
            claimsError: null,
          }))
          await state.user.getIdToken(true)
          const tokenResult = await state.user.getIdTokenResult()
          setState((prev) => ({
            ...prev,
            claims: tokenResult?.claims || null,
            claimsLoading: false,
            claimsError: null,
          }))
        } catch (err) {
          setState((prev) => ({
            ...prev,
            claims: null,
            claimsLoading: false,
            claimsError: err,
          }))
        }
      },
    }),
    [state.user, state.loading, state.error, state.claims, state.claimsLoading, state.claimsError, isAuthenticated, role, isAdmin],
  )
}
