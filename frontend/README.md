# Binks — Frontend

Interfaz web del sistema de gestión gastronómica. Hecha con React + TypeScript + Vite.

## Cómo correrlo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # compila para producción
npm run lint     # revisa el código
```

## Estructura de `src/`

```
src/
├── app/         # App.tsx, router y providers
├── layouts/     # Layouts generales (AppLayout)
├── features/    # Una carpeta por funcionalidad (sales, orders, delivery, ...)
│   └── sales/   # pages, components, hooks, services, types
├── shared/      # Lo reutilizable: components, hooks, services, utils, types
└── styles/      # reset.css, variables.css, global.css
```

### Reglas

- Lo que se usa en varias funcionalidades va en `shared/`. Lo propio de una funcionalidad queda dentro de su `features/<nombre>/`.
- Cada componente va en su carpeta: `Componente.tsx` + `Componente.module.css` (CSS Modules).
- Sin precios ni reglas del negocio escritos en el código: todo viene del backend.
- Commits en español y simples, con prefijo (`feat:`, `fix:`, `chore:`). Una rama por tarea y Pull Request a `main`.

## Catálogo de Caja

Si no tenés `.env.local`, crealo a partir de `.env.example`. Completá
`VITE_API_URL` con el origen confirmado de la API y `VITE_BUSINESS_ID` con el ID
real del negocio existente en ese backend. Es obligatorio y debe ser un entero
positivo válido para PostgreSQL. No hay negocio predeterminado. Reiniciá Vite
si cambiás la configuración. Las variables `VITE_*` son públicas; no guardes secretos.

Caja reutiliza `getCatalog` y consulta una sola vez
`GET /api/businesses/:businessId/catalog` por carga o reintento. No requiere
cambios en el backend. Los precios se muestran desde `priceCents`, sin asumir
una moneda que el contrato no especifica.

La navegación usa `/caja` con parámetros `categoria`, `producto` y `variante`.
Permite volver con los enlaces del catálogo o el historial del navegador.
Cada selección se valida contra los datos del negocio; cambiar de categoría o
producto elimina las selecciones dependientes. No crea pedidos ni agrega un carrito.

Verificación manual con un negocio configurado:

- Navegar categorías, productos y variantes; volver y recargar una URL seleccionada.
- Cambiar de producto y comprobar que no conserva una variante ajena.
- Probar categorías sin productos, productos sin variantes y catálogo sin categorías.
- Simular una falla de red o un error 500, restaurar la conexión y reintentar.
- Verificar configuración ausente/inválida y respuesta 404, sin confundirlas con catálogo vacío.
- Recorrer la interfaz con teclado y comprobar el menú y las tarjetas a 320 px de ancho.

### Preparación de la conexión local

`VITE_API_URL` es obligatorio: debe contener el origen HTTP(S) confirmado de la
API, sin credenciales, `/api`, otras rutas, parámetros ni fragmentos. Por ejemplo,
el formato es `https://host:puerto`; no hay un servidor predeterminado.
`VITE_BUSINESS_ID` también es obligatorio. Si falta alguna variable o es inválida,
Caja muestra un mensaje de configuración y no realiza la consulta.

El archivo local `.env.local` está ignorado por Git. Completá las variables vacías
con datos confirmados, conservando cualquier configuración propia existente.
Pedile al responsable del backend:

- El origen accesible de la API Binks y confirmación de que `/api/health` y
  `/api/health/db` responden correctamente.
- El ID real del negocio en esa misma base y confirmación de que
  `GET /api/businesses/:businessId/catalog` funciona.
- Confirmación de que CORS permite el origen exacto que muestra Vite al arrancar
  (incluye protocolo, host y puerto).

Reiniciá `npm run dev` después de editar las variables. Verificaciones del frontend:
`npm test`, `npm run lint` y `npm run build`. Los tests usan únicamente fixtures y
respuestas simuladas; no consultan ni modifican el backend. Para ejecutarlos se
requiere Node 22.18+ o 24 (carga nativa de TypeScript en las pruebas de configuración).
