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
