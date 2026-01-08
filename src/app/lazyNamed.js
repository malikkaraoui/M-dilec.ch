import { lazy } from 'react'

/**
 * Lazy-load un export nommé d’un module.
 * Exemple: lazyNamed(() => import('./pages/Home.jsx'), 'HomePage')
 */
export function lazyNamed(factory, exportName) {
  return lazy(async () => {
    const mod = await factory()
    const Component = mod && mod[exportName]

    if (!Component) {
      throw new Error(`lazyNamed: export "${exportName}" introuvable`) // fail-fast
    }

    return { default: Component }
  })
}
