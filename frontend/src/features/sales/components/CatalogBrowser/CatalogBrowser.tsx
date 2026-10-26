import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Catalog } from '../../types/catalog.types'
import CatalogFeedback from '../CatalogFeedback/CatalogFeedback'
import styles from './CatalogBrowser.module.css'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function CatalogBrowser({ catalog }: { catalog: Catalog }) {
  const [params, setParams] = useSearchParams()
  const category = catalog.categories.find((item) => String(item.id) === params.get('categoria'))
  const product = category?.products.find((item) => String(item.id) === params.get('producto'))
  const variant = product?.variants.find((item) => String(item.id) === params.get('variante'))
  const heading = useRef<HTMLHeadingElement>(null)
  const categoryId = category?.id
  const productId = product?.id

  useEffect(() => {
    heading.current?.focus()
  }, [categoryId, productId])

  function destination(categoryId?: number, productId?: number, variantId?: number) {
    const next = new URLSearchParams(params)
    for (const key of ['categoria', 'producto', 'variante']) next.delete(key)
    if (categoryId !== undefined) next.set('categoria', String(categoryId))
    if (productId !== undefined) next.set('producto', String(productId))
    if (variantId !== undefined) next.set('variante', String(variantId))
    const search = next.toString()
    return { pathname: '/caja', search: search ? `?${search}` : '' }
  }

  function setVariant(id: number) {
    if (!category || !product) return
    setParams(destination(category.id, product.id, id).search, { replace: true, preventScrollReset: true })
  }

  if (catalog.categories.length === 0) {
    return <CatalogFeedback>No hay productos disponibles en el catálogo.</CatalogFeedback>
  }

  // Los IDs se resuelven siempre contra el catálogo del negocio actual.
  const invalidSelection =
    (params.has('categoria') && !category) ||
    (params.has('producto') && !product) ||
    (params.has('variante') && !variant)

  return (
    <div className={styles.catalog}>
      <nav aria-label="Navegación del catálogo">
        <ol className={styles.breadcrumbs}>
          <li><Link to={destination()} aria-current={!category ? 'page' : undefined}>Categorías</Link></li>
          {category && <li><Link to={destination(category.id)} aria-current={!product ? 'page' : undefined}>{category.name}</Link></li>}
          {product && <li><span aria-current="page">{product.name}</span></li>}
        </ol>
      </nav>

      {invalidSelection && <CatalogFeedback>La selección ya no está disponible. Elegí una opción del catálogo.</CatalogFeedback>}

      <h2 ref={heading} tabIndex={-1}>
        {product ? `Variantes de ${product.name}` : category ? `Productos de ${category.name}` : 'Categorías'}
      </h2>

      {!category && (
        <>
          {catalog.categories.every((item) => item.products.length === 0) &&
            <CatalogFeedback>No hay productos disponibles en las categorías.</CatalogFeedback>}
          <ul className={styles.grid}>
            {catalog.categories.map((item) => (
              <li key={item.id}>
                <Link className={styles.card} to={destination(item.id)}>
                  <strong>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                  <span>{item.products.length} {item.products.length === 1 ? 'producto' : 'productos'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {category && !product && (
        category.products.length === 0
          ? <CatalogFeedback>No hay productos disponibles en esta categoría.</CatalogFeedback>
          : <ul className={styles.grid}>
            {category.products.map((item) => (
              <li key={item.id}>
                <Link className={styles.card} to={destination(category.id, item.id)}>
                  <strong>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                  <span>{item.variants.length === 0 ? 'Sin variantes disponibles' : 'Ver variantes'}</span>
                </Link>
              </li>
            ))}
          </ul>
      )}

      {category && product && (
        <>
          {product.description && <p>{product.description}</p>}
          {product.variants.length === 0
            ? <CatalogFeedback>Este producto no tiene variantes disponibles para seleccionar.</CatalogFeedback>
            : <fieldset className={styles.variants}>
              <legend>Seleccioná una variante</legend>
              {product.variants.map((item) => (
                <label key={item.id} className={`${styles.card} ${variant?.id === item.id ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="catalog-variant"
                    value={item.id}
                    checked={variant?.id === item.id}
                    onChange={() => setVariant(item.id)}
                  />
                  <span><strong>{item.name}</strong><br />Precio: {priceFormatter.format(item.priceCents / 100)}</span>
                </label>
              ))}
            </fieldset>}
          <div role="status" aria-live="polite" aria-atomic="true">
            {variant && <p>Seleccionado: <strong>{product.name} — {variant.name}</strong>. Precio: {priceFormatter.format(variant.priceCents / 100)}</p>}
          </div>
        </>
      )}
    </div>
  )
}
