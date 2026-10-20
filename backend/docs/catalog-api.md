# API de catálogo

Contrato del endpoint utilizado por el frontend para obtener el catálogo disponible de un negocio.

## Endpoint

`GET /api/businesses/:businessId/catalog`

### Parámetro

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `businessId` | integer | ID del negocio |

---

## Respuesta exitosa

Status:

`200 OK`

Ejemplo:

```json
{
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Pollos",
        "description": "Pollo a la parrilla",
        "sortOrder": 0,
        "products": [
          {
            "id": 1,
            "name": "Pollo a la parrilla",
            "description": null,
            "sortOrder": 0,
            "variants": [
              {
                "id": 1,
                "name": "Entero",
                "priceCents": 1200000,
                "sortOrder": 0
              },
              {
                "id": 2,
                "name": "Medio",
                "priceCents": 650000,
                "sortOrder": 1
              },
              {
                "id": 3,
                "name": "Cuarto",
                "priceCents": 350000,
                "sortOrder": 2
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Tipos

```ts
type CatalogVariant = {
  id: number;
  name: string;
  priceCents: number;
  sortOrder: number;
};

type CatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  variants: CatalogVariant[];
};

type CatalogCategory = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  products: CatalogProduct[];
};

type CatalogResponse = {
  data: {
    categories: CatalogCategory[];
  };
};
```

---

## Reglas del endpoint

El endpoint devuelve únicamente elementos activos:

- categorías con `active = true`;
- productos con `active = true`;
- variantes con `active = true`.

Los elementos se devuelven ordenados por `sortOrder`.

El catálogo está aislado por `businessId`, por lo que no devuelve información perteneciente a otros negocios.

Una categoría puede existir sin productos activos y devolverse de esta forma:

```json
{
  "id": 1,
  "name": "Pollos",
  "description": null,
  "sortOrder": 0,
  "products": []
}
```

Un producto puede existir sin variantes activas y devolverse de esta forma:

```json
{
  "id": 1,
  "name": "Pollo a la parrilla",
  "description": null,
  "sortOrder": 0,
  "variants": []
}
```

---

## Precios

Los precios se envían como enteros en centavos mediante la propiedad `priceCents`.

Ejemplo:

```json
{
  "priceCents": 1200000
}
```

Representa:

`$12.000,00`

El backend es la fuente del precio.

El frontend no debe hardcodear precios ni reemplazar el valor recibido desde la API.

Para mostrar el precio al usuario, el frontend puede convertirlo únicamente a nivel de presentación.

Ejemplo:

```ts
const price = variant.priceCents / 100;
```

---

## Catálogo vacío

Si el negocio existe pero no tiene categorías activas, la API devuelve:

```json
{
  "data": {
    "categories": []
  }
}
```

Status:

`200 OK`

Esto no se considera un error.

---

## Negocio inexistente

Si el `businessId` es válido pero el negocio no existe:

Status:

`404 Not Found`

Respuesta:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Negocio no encontrado"
  }
}
```

---

## businessId inválido

Si el valor recibido como `businessId` no es válido:

Ejemplo:

`GET /api/businesses/abc/catalog`

Status:

`400 Bad Request`

Respuesta:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request invalido",
    "details": [
      {
        "path": "businessId",
        "message": "Invalid input: expected number, received NaN"
      }
    ]
  }
}
```

---

## Uso desde Caja

Caja debe obtener el catálogo mediante una sola petición:

`GET /api/businesses/:businessId/catalog`

La respuesta ya contiene la estructura necesaria:

```text
Category[]
└── Product[]
    └── Variant[]
        └── priceCents
```

El frontend no necesita construir el catálogo realizando peticiones separadas a:

```text
/categories
/products
/products/:productId/variants
```

Los endpoints individuales quedan disponibles para operaciones CRUD y administrativas.

---

## Responsabilidades del frontend

El frontend puede:

- mostrar categorías;
- mostrar productos;
- mostrar variantes;
- mostrar precios;
- ordenar o renderizar la información recibida;
- transformar `priceCents` para presentación visual.

El frontend no debe:

- hardcodear productos;
- hardcodear categorías;
- hardcodear variantes;
- hardcodear precios;
- reconstruir reglas de negocio relacionadas con precios;
- mezclar información de distintos negocios.

---

## Flujo esperado

```text
Caja
  ↓
GET /api/businesses/:businessId/catalog
  ↓
Backend
  ↓
PostgreSQL
  ↓
Category[]
  └── Product[]
      └── Variant[]
          └── priceCents
  ↓
Frontend renderiza el catálogo
```

---

## Pruebas realizadas

El endpoint fue probado manualmente con la base de desarrollo.

Caso exitoso:

`GET /api/businesses/1/catalog`

Resultado:

`200 OK`

El endpoint devolvió categorías, productos y variantes agrupadas correctamente.

Negocio inexistente:

`GET /api/businesses/2147483647/catalog`

Resultado:

`404 Not Found`

Código de error:

`NOT_FOUND`

businessId inválido:

`GET /api/businesses/abc/catalog`

Resultado:

`400 Bad Request`

Código de error:

`VALIDATION_ERROR`

Además, el comportamiento del catálogo está cubierto por tests automatizados de repository y API.
