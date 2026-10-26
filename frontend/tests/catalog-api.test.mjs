import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

// Origen e ID ficticios usados exclusivamente como fixtures; no hay conexiones reales.
test('getCatalog y cliente HTTP con respuestas simuladas', async (t) => {
  const originalUrl = process.env.VITE_API_URL
  const originalId = process.env.VITE_BUSINESS_ID
  process.env.VITE_BUSINESS_ID = '42'
  const originalFetch = globalThis.fetch
  process.env.VITE_API_URL = 'https://api.example.test/'
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { getCatalog } = await server.ssrLoadModule('/src/features/sales/services/catalog.service.ts')
    const { ApiError } = await server.ssrLoadModule('/src/shared/services/api.ts')

    await t.test('Caja muestra carga mientras la consulta está pendiente', async () => {
      const { default: SalesPage } = await server.ssrLoadModule('/src/features/sales/pages/SalesPage.tsx')
      const html = renderToStaticMarkup(createElement(SalesPage))
      assert.match(html, /role="status"/)
      assert.match(html, /Cargando catálogo/)
    })

    await t.test('catálogo vacío muestra un mensaje accesible', async () => {
      const { default: Browser } = await server.ssrLoadModule('/src/features/sales/components/CatalogBrowser/CatalogBrowser.tsx')
      const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Browser, { catalog: { categories: [] } })))
      assert.match(html, /role="status"/)
      assert.match(html, /No hay productos disponibles/)
    })

    await t.test('error con reintento se renderiza como alerta y botón', async () => {
      const { default: Feedback } = await server.ssrLoadModule('/src/features/sales/components/CatalogFeedback/CatalogFeedback.tsx')
      const html = renderToStaticMarkup(createElement(Feedback, { error: true, onRetry() {} }, 'No se pudo cargar el catálogo'))
      assert.match(html, /role="alert"/)
      assert.match(html, /<button type="button">Reintentar<\/button>/)
    })

    await t.test('combina origen, ruta e ID y devuelve el catálogo sin alterar precios', async () => {
      const catalog = { categories: [{ id: 8, products: [{ id: 9, variants: [{ id: 10, priceCents: 123456 }] }] }] }
      const controller = new AbortController()
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.example.test/api/businesses/42/catalog')
        assert.equal(options.method, 'GET')
        assert.equal(options.signal, controller.signal)
        return Response.json({ data: catalog })
      }
      assert.deepEqual(await getCatalog(42, controller.signal), catalog)
    })

    await t.test('catálogo vacío sigue siendo una respuesta exitosa', async () => {
      globalThis.fetch = async () => Response.json({ data: { categories: [] } })
      assert.deepEqual(await getCatalog(42), { categories: [] })
    })

    await t.test('backend desconectado produce NETWORK_ERROR; la siguiente petición puede recuperarse', async () => {
      globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
      await assert.rejects(getCatalog(42), (error) => error instanceof ApiError && error.status === 0 && error.code === 'NETWORK_ERROR')
      globalThis.fetch = async () => Response.json({ data: { categories: [] } })
      assert.deepEqual(await getCatalog(42), { categories: [] })
    })

    await t.test('preserva el estado y código de errores HTTP', async () => {
      for (const status of [400, 404, 500, 503]) {
        globalThis.fetch = async () => Response.json({ error: { code: 'TEST_ERROR', message: 'Error simulado' } }, { status })
        await assert.rejects(getCatalog(42), (error) => error instanceof ApiError && error.status === status && error.code === 'TEST_ERROR')
      }
    })

    await t.test('una respuesta HTML de otro servidor produce error controlado', async () => {
      globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404 })
      await assert.rejects(getCatalog(42), (error) => error instanceof ApiError && error.status === 404)
    })

    await t.test('la cancelación se preserva como AbortError', async () => {
      const error = new DOMException('Cancelado', 'AbortError')
      globalThis.fetch = async () => { throw error }
      await assert.rejects(getCatalog(42), (received) => received === error)
    })
  } finally {
    if (originalId === undefined) delete process.env.VITE_BUSINESS_ID
    else process.env.VITE_BUSINESS_ID = originalId
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.VITE_API_URL
    else process.env.VITE_API_URL = originalUrl
    await server.close()
  }
})

test('configuración ausente bloquea la consulta y muestra un mensaje', async () => {
  const originalUrl = process.env.VITE_API_URL
  const originalFetch = globalThis.fetch
  process.env.VITE_API_URL = ''
  let requests = 0
  globalThis.fetch = async () => { requests++; throw new Error('No debería consultar') }
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { getCatalog } = await server.ssrLoadModule('/src/features/sales/services/catalog.service.ts')
    await assert.rejects(getCatalog(42), (error) => error.code === 'CONFIGURATION_ERROR')
    const { default: SalesPage } = await server.ssrLoadModule('/src/features/sales/pages/SalesPage.tsx')
    const html = renderToStaticMarkup(createElement(SalesPage))
    assert.match(html, /configuración de conexión válida/)
    assert.match(html, /role="alert"/)
    assert.equal(requests, 0)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.VITE_API_URL
    else process.env.VITE_API_URL = originalUrl
    await server.close()
  }
})
