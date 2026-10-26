import { useEffect, useState } from 'react'
import { getCatalog } from '../services/catalog.service'
import type { Catalog } from '../types/catalog.types'

type CatalogState =
  | { status: 'loading' }
  | { status: 'success'; catalog: Catalog }
  | { status: 'error'; error: unknown }

export function useCatalog(businessId: number) {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCatalog(businessId, controller.signal).then(
      (catalog) => {
        if (!controller.signal.aborted) setState({ status: 'success', catalog })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [businessId, attempt])

  function retry() {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  return { state, retry }
}
