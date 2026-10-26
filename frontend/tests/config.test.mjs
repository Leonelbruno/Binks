import assert from 'node:assert/strict'
import test from 'node:test'
import { parseApiUrl, parseBusinessId } from '../src/shared/config/validation.ts'

test('API: acepta un origen HTTP(S) y normaliza espacios y barra final', () => {
  assert.equal(parseApiUrl(' https://api.example.test/ '), 'https://api.example.test')
  assert.equal(parseApiUrl('http://localhost:4567'), 'http://localhost:4567')
})

test('API: rechaza ausencia, URL inválida, credenciales, rutas, query y fragmentos', () => {
  for (const value of [undefined, '', ' ', 'localhost:3000', 'ftp://example.test', 'https://user:pass@example.test', 'https://example.test/api', 'https://example.test/?x=1', 'https://example.test/#section']) {
    assert.equal(parseApiUrl(value), null, String(value))
  }
})

test('negocio: acepta IDs dentro del rango del contrato', () => {
  assert.equal(parseBusinessId(' 42 '), 42)
  assert.equal(parseBusinessId('2147483647'), 2147483647)
})

test('negocio: rechaza ausencia, cero, negativos, fracciones y desbordamientos', () => {
  for (const value of [undefined, '', ' ', '0', '-1', '1.5', 'abc', '1e2', '2147483648']) {
    assert.equal(parseBusinessId(value), null, String(value))
  }
})
