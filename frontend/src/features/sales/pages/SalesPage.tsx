import { useReducer, useState } from 'react'
import { apiUrl } from '../../../shared/config/api'
import { ApiError } from '../../../shared/services/api'
import CatalogBrowser from '../components/CatalogBrowser/CatalogBrowser'
import CatalogFeedback from '../components/CatalogFeedback/CatalogFeedback'
import CurrentOrderPanel from '../components/CurrentOrderPanel/CurrentOrderPanel'
import { businessId } from '../config/business'
import { orderReducer } from '../hooks/useCurrentOrder'
import { useCatalog } from '../hooks/useCatalog'
import { createOrder } from '../services/order.service'
import type { CartItem } from '../types/cart.types'
import styles from './SalesPage.module.css'

function BusinessCatalog({ id, onAddVariant }: { id: number; onAddVariant: (item: CartItem) => void }) {
  const { state, retry } = useCatalog(id)

  if (state.status === 'loading') {
    return <CatalogFeedback>Cargando catálogo…</CatalogFeedback>
  }
  if (state.status === 'error') {
    const status = state.error instanceof ApiError ? state.error.status : undefined
    const canRetry = status === undefined || status === 0 || status === 408 || status === 429 || status >= 500
    const message = status === 404
      ? 'No se encontró el negocio configurado. Revisá la configuración con el administrador.'
      : status === 400
        ? 'La configuración del negocio no es válida. Revisala con el administrador.'
        : status === 401 || status === 403
          ? 'No tenés permiso para consultar este catálogo.'
          : 'No se pudo cargar el catálogo. Intentá nuevamente.'
    return <CatalogFeedback error onRetry={canRetry ? retry : undefined}>{message}</CatalogFeedback>
  }
  return <CatalogBrowser catalog={state.catalog} onAddVariant={onAddVariant} />
}

export default function SalesPage() {
  const [items, dispatch] = useReducer(orderReducer, [])
  const [isConfirming, setIsConfirming] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const addVariantToOrder = (item: CartItem) => {
    dispatch({ type: 'add', item })
  }

  const handleIncrease = (variantId: number) => {
    dispatch({ type: 'increase', variantId })
  }

  const handleDecrease = (variantId: number) => {
    dispatch({ type: 'decrease', variantId })
  }

  const handleRemove = (variantId: number) => {
    dispatch({ type: 'remove', variantId })
  }

  const handleClear = () => {
    dispatch({ type: 'clear' })
  }

  const handleConfirm = async () => {
    if (items.length === 0 || isConfirming || businessId === null || apiUrl === null) {
      return
    }

    setIsConfirming(true)
    setFeedback(null)

    try {
      const created = await createOrder(
        businessId,
        items.map(({ variantId, quantity }) => ({ variantId, quantity })),
      )
      dispatch({ type: 'clear' })
      setFeedback({
        type: 'success',
        message: created.orderNumber
          ? `Pedido ${created.orderNumber} registrado correctamente.`
          : 'Pedido registrado correctamente.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof ApiError ? error.message : 'No se pudo registrar el pedido.',
      })
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <section aria-labelledby="sales-title">
      <h1 id="sales-title">Caja</h1>
      <div className={styles.layout}>
        <div className={styles.catalog}>
          {businessId === null || apiUrl === null
            ? <CatalogFeedback error>El catálogo no está disponible porque falta completar una configuración de conexión válida.</CatalogFeedback>
            : <BusinessCatalog key={businessId} id={businessId} onAddVariant={addVariantToOrder} />}
        </div>

        <CurrentOrderPanel
          items={items}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          onRemove={handleRemove}
          onClear={handleClear}
          onConfirm={handleConfirm}
          isConfirming={isConfirming}
        />
      </div>

      {feedback && (
        <div role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite" aria-atomic="true">
          {feedback.message}
        </div>
      )}
    </section>
  )
}
