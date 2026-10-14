# Cómo crear un módulo

Guía basada en el módulo `category`, que es la implementación de referencia. Antes de escribir uno nuevo, leé esos archivos.

## Estructura

```
src/modules/<nombre>/
  <nombre>.schemas.ts      Zod: params, query, body e inputs inferidos
  <nombre>.repository.ts   SQL explícito. Sin reglas de negocio
  <nombre>.service.ts      Reglas de negocio y traducción de errores
  <nombre>.controller.ts   Parsea el request, llama al service, arma la respuesta
  <nombre>.routes.ts       Rutas del módulo
tests/modules/<nombre>/
  <nombre>.repository.test.ts
  <nombre>.api.test.ts
```

El módulo se registra en `src/routes.ts`, donde se arman las dependencias.

## Capas

| Capa       | Hace                                            | No hace                |
| ---------- | ----------------------------------------------- | ---------------------- |
| schemas    | Valida forma y tipos del request                | Reglas de negocio      |
| controller | `schema.parse(...)`, llama al service, responde | SQL, reglas, try/catch |
| service    | Reglas, 404 y 409, coordina repositories        | SQL, conocer Express   |
| repository | SQL y mapeo snake_case a camelCase              | Reglas de negocio      |

Los errores async no necesitan `try/catch` en el controller: Express 5 los manda al middleware de errores.

## Reglas obligatorias

1. **Todo método de repository recibe `businessId` como primer parámetro** y lo usa en el `WHERE`. Cada repository tiene un test de aislamiento.
2. **Las rutas cuelgan de `/api/businesses/:businessId/...`.**
3. **El repository recibe su conexión** (`createXRepository(db)`), no importa el pool. Así se puede testear con un schema temporal.
4. **El body nunca elige columnas ni `businessId`.** Los schemas son `strictObject`, así que un campo desconocido da 400.
5. **Los nombres de columna de un `UPDATE` salen de una lista fija**, nunca del request.
6. **Nada se borra con `DELETE` si otras tablas lo referencian.** Se desactiva con `active: false`.
7. **Precios en centavos enteros** (`price_cents`).
8. **IDs numéricos con tope `2_147_483_647`**, para que un número fuera de rango dé 400 y no un 500 de Postgres.

## Formato de la API

- Éxito: `{ "data": ... }` con 200, o 201 al crear.
- Error: `{ "error": { "code", "message", "details?" } }`.
- Claves en camelCase en la API, snake_case en la base.

| Situación                                        | Error                                | Status |
| ------------------------------------------------ | ------------------------------------ | ------ |
| Request mal formado (Zod)                        | `ZodError`, lo traduce el middleware | 400    |
| Negocio o recurso inexistente, o de otro negocio | `NotFoundError`                      | 404    |
| Duplicado (unique violation `23505`)             | `ConflictError`                      | 409    |
| Estado inválido                                  | `InvalidStateTransitionError`        | 409    |
| Regla de negocio incumplida                      | `BusinessRuleError`                  | 422    |

Un recurso de otro negocio responde 404, no 403: no se revela qué existe.

## Tests

- **Repository:** schema temporal con migraciones, pool con `search_path`. Cubre el aislamiento entre negocios.
- **API:** `supertest` contra `app` y la base `binks_test`. Cubre 200/201, 400, 404 y 409. Crea sus propios datos con slugs únicos y los borra al terminar.
- Sin mocks de repository.

## Pasos para un módulo nuevo

1. Escribir el schema Zod (params, query, body).
2. Repository con los tests de aislamiento.
3. Service con las reglas y la traducción de errores de base.
4. Controller y rutas.
5. Registrar en `src/routes.ts`.
6. Tests de API.
7. `npm run typecheck && npm test` en verde.

## Notas para `product`

- `product` y `product_variant` tienen FK compuestas con `business_id`. Si se crea un producto con una categoría de otro negocio, la base responde con violación de FK (`23503`). Antes de insertar, el service tiene que verificar con `categories.findById(businessId, categoryId)` y devolver 404 si no existe.
- `UNIQUE (business_id, category_id, name)` en `product` y `UNIQUE (product_id, name)` en `product_variant`: traducir `23505` a `ConflictError` filtrando por el nombre de la constraint, como en `category.service.ts`.
- `price_cents` es entero y `>= 0` (hay un `CHECK` en la base).
