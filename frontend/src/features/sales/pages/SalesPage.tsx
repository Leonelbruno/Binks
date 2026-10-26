import { apiUrl } from '../../../shared/config/api'
import { ApiError } from '../../../shared/services/api'
import CatalogBrowser from '../components/CatalogBrowser/CatalogBrowser'
import CatalogFeedback from '../components/CatalogFeedback/CatalogFeedback'
import { businessId } from '../config/business'
import { useCatalog } from '../hooks/useCatalog'

function BusinessCatalog({ id }: { id: number }) {
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
  return <CatalogBrowser catalog={state.catalog} />
}

export default function SalesPage() {
  return (
    <section aria-labelledby="sales-title">
      <h1 id="sales-title">Caja</h1>
      {businessId === null || apiUrl === null
        ? <CatalogFeedback error>El catálogo no está disponible porque falta completar una configuración de conexión válida.</CatalogFeedback>
        : <BusinessCatalog key={businessId} id={businessId} />}
    </section>
  )
}
