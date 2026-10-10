# Backend de Binks

API en Node + Express + TypeScript, con PostgreSQL.

## Requisitos

- Node.js 22 o 24 (probado en ambos)
- Docker Desktop abierto y funcionando

## Primera vez

Desde la raíz del repo:

```bash
docker compose up -d
cd backend
npm install
cp .env.example .env
npm run dev
```

Con el servidor corriendo, `http://localhost:3000/api/health` tiene que responder `{"status":"ok", ...}`.

## Puertos

| Servicio   | Puerto | Nota                                                     |
| ---------- | ------ | -------------------------------------------------------- |
| API        | 3000   | Se cambia con `PORT` en `.env`                           |
| PostgreSQL | 5434   | Es el puerto de tu compu; adentro del contenedor es 5432 |

Si algo ya usa alguno de esos puertos, Docker o la API no arrancan. Revisalo con `netstat -ano | grep :5434`.

## Scripts

| Comando             | Qué hace                                     |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Levanta la API con recarga automática        |
| `npm run build`     | Compila a `dist/` (sin los tests)            |
| `npm start`         | Corre lo compilado                           |
| `npm run typecheck` | Revisa los tipos sin generar archivos        |
| `npm test`          | Corre los tests (necesita la base encendida) |

## Base de datos

Hay dos bases dentro del mismo contenedor:

- `binks`: desarrollo.
- `binks_test`: tests. Los tests usan **siempre** esta y nunca la de desarrollo.

El script que crea `binks_test` corre solo la primera vez que se crea el volumen.
Para empezar de cero (**borra todos los datos**):

```bash
docker compose down -v
docker compose up -d
```

## Estructura

```
src/
├── config/        variables de entorno y conexión a la base
├── middleware/    manejo de errores
├── modules/       un módulo por entidad
└── shared/        errores y utilidades comunes
```

Cada módulo sigue: routes → controller → service → repository. Los controllers son livianos y las reglas de negocio viven en el service.

## Reglas del proyecto

- Un solo modelo `Order`, con `source`: `LOCAL`, `WHATSAPP` o `PEDIDOS_YA`.
- Nada de precios, promociones ni reglas escritos en el código: todo sale de la base.
- El backend valida las reglas de negocio, no solo el frontend.
- Toda tabla lleva `businessId`, y todo método de repository recibe `businessId` como primer parámetro.

## Decisiones técnicas

| Tema                    | Decisión                                                                                                                                                        | Por qué                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Acceso a la base        | `pg` con SQL explícito, sin ORM                                                                                                                                 | Control total del SQL. La falta de tipos se compensa con tests.                |
| Aislamiento por negocio | `businessId` como primer parámetro de todo método de repository, más un test que mezcla datos de dos negocios                                                   | Evitar que un negocio vea datos de otro.                                       |
| Validación              | Zod en el borde para la forma del request. Las reglas de negocio van en el service                                                                              | Las reglas dependen de datos de la base, y un schema no puede consultarla.     |
| Precios                 | El cliente manda IDs y cantidades, nunca precios. El service calcula y guarda el precio como snapshot                                                           | El backend es la autoridad. Modificar el request desde el navegador no sirve.  |
| Errores                 | `AppError` y subclases: 400 forma inválida, 404 no encontrado, 409 transición de estado inválida, 422 regla de negocio. Un solo middleware las traduce          | Respuestas de error con el mismo formato en toda la API.                       |
| Tests                   | Vitest con Postgres real (`binks_test`), sin mocks de repositories                                                                                              | Los mocks no prueban el SQL ni el aislamiento por negocio.                     |
| Módulos                 | ESM con `NodeNext`. Los imports relativos llevan `.js`. `tsx` en desarrollo                                                                                     | Vitest es nativo ESM y el ecosistema va en esa dirección.                      |
| Migraciones             | SQL plano en `database/migrations/`, nombradas `001_nombre.sql`. Solo hacia adelante, cada una dentro de una transacción. Una migración ya aplicada no se edita | Los `down` casi nunca se prueban. Un error se corrige con una migración nueva. |
| Entorno local           | Docker Compose con PostgreSQL 17                                                                                                                                | Todos con la misma versión y configuración.                                    |

Las reglas de `businessId` y de precios se aplican desde el primer módulo, que todavía no existe.
