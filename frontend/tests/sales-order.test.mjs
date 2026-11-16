import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const sampleItem = {
  variantId: 7,
  quantity: 1,
  productName: 'Milanesa',
  variantName: 'Simple',
  unitPriceCents: 15000,
}

test('orderReducer combina variantes repetidas y actualiza cantidades', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { orderReducer } = await server.ssrLoadModule('/src/features/sales/hooks/useCurrentOrder.ts')

    const added = orderReducer([], { type: 'add', item: sampleItem })
    assert.deepEqual(added, [sampleItem])

    const merged = orderReducer([sampleItem], { type: 'add', item: { ...sampleItem, quantity: 2 } })
    assert.deepEqual(merged, [{ ...sampleItem, quantity: 3 }])

    const increased = orderReducer([sampleItem], { type: 'increase', variantId: 7 })
    assert.equal(increased[0].quantity, 2)

    const itemWithThree = { ...sampleItem, quantity: 3 }
    const decreased = orderReducer([itemWithThree, { ...sampleItem, variantId: 9, quantity: 2 }], { type: 'decrease', variantId: 7 })
    assert.equal(decreased[0].quantity, 2)
    assert.equal(decreased[1].quantity, 2)

    const removed = orderReducer([sampleItem], { type: 'remove', variantId: 7 })
    assert.deepEqual(removed, [])

    const cleared = orderReducer([sampleItem], { type: 'clear' })
    assert.deepEqual(cleared, [])
  } finally {
    await server.close()
  }
})

test('CurrentOrderPanel renderiza total estimado y estado de confirmación', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { default: CurrentOrderPanel } = await server.ssrLoadModule('/src/features/sales/components/CurrentOrderPanel/CurrentOrderPanel.tsx')

    const markup = renderToStaticMarkup(createElement(CurrentOrderPanel, {
      items: [sampleItem],
      onIncrease() {},
      onDecrease() {},
      onRemove() {},
      onClear() {},
      onConfirm() {},
    }))
    assert.match(markup, /Total estimado/)
    assert.match(markup, /Confirmar pedido/)

    const confirmingMarkup = renderToStaticMarkup(createElement(CurrentOrderPanel, {
      items: [sampleItem],
      onIncrease() {},
      onDecrease() {},
      onRemove() {},
      onClear() {},
      onConfirm() {},
      isConfirming: true,
    }))
    assert.match(confirmingMarkup, /Confirmando…/)
  } finally {
    await server.close()
  }
})

test('createOrder envía solo variantId y quantity y reexpone la respuesta', async () => {
  const originalUrl = process.env.VITE_API_URL
  const originalBusinessId = process.env.VITE_BUSINESS_ID
  const originalFetch = globalThis.fetch
  process.env.VITE_API_URL = 'https://api.example.test/'
  process.env.VITE_BUSINESS_ID = '42'

  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { createOrder } = await server.ssrLoadModule('/src/features/sales/services/order.service.ts')
    const payload = [{ variantId: 7, quantity: 2 }, { variantId: 9, quantity: 1 }]

    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.example.test/api/businesses/42/orders')
      assert.equal(options.method, 'POST')
      assert.deepEqual(JSON.parse(options.body), { items: payload })
      return Response.json({
        data: { id: 1, businessId: 42, orderNumber: 12, source: 'LOCAL', status: 'IN_PROGRESS', totalCents: 30000, items: [], createdAt: '2026-11-16T00:00:00.000Z', updatedAt: '2026-11-16T00:00:00.000Z' },
      })
    }

    const result = await createOrder(42, payload)
    assert.equal(result.orderNumber, 12)
  } finally {
    if (originalBusinessId === undefined) delete process.env.VITE_BUSINESS_ID
    else process.env.VITE_BUSINESS_ID = originalBusinessId
    if (originalUrl === undefined) delete process.env.VITE_API_URL
    else process.env.VITE_API_URL = originalUrl
    globalThis.fetch = originalFetch
    await server.close()
  }
})
