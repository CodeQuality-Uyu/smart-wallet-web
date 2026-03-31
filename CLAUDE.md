# SmartWallet

## 🧭 Descripción general

Aplicación de finanzas personales para controlar gastos, ingresos y pagos recurrentes en dos monedas (USD y UYU). Diseñada para uso familiar con datos reales en producción — toda decisión técnica debe ser retrocompatible y segura.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript + Vite |
| Estilos | CSS Modules + design tokens (variables CSS) |
| Estado servidor | @tanstack/react-query |
| Formularios | Formik + Yup |
| Routing | React Router v6 |
| Backend prod | Firebase (Firestore + Auth + Hosting) |
| Backend dev | MSW (Mock Service Worker) |
| Linting | ESLint + Prettier |
| Tests | Vitest (locales, sin CI) |

**Selección de backend**: variable de entorno `VITE_BACKEND=firestore` (prod) o `VITE_BACKEND=msw` (dev/test).

---

## 📁 Estructura relevante

```
src/
├── backend/
│   ├── types.ts          ← interfaces IXxxBackend + tipos compartidos
│   ├── firestore/        ← implementación producción
│   └── msw/              ← implementación desarrollo
├── services/             ← capa entre hooks y backend (XxxService)
├── features/
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       └── schemas/      ← Yup schemas + tipos de formulario
├── pages/                ← componentes de ruta
├── components/
│   ├── ui/               ← primitivos (Button, Modal, FormField…)
│   └── shared/           ← PageHeader, LoadingSpinner, ErrorMessage
├── types/
│   ├── models/index.ts   ← interfaces de dominio
│   └── enums/index.ts    ← enums (nunca string unions)
└── tests/mocks/
    ├── handlers.ts        ← endpoints MSW
    └── data/             ← datos mock por entidad

firestore.rules           ← SIEMPRE actualizar cuando cambia el modelo de datos
```

---

## ✅ Estado actual

### Funciona
- Auth (Firebase email/link)
- Gastos: CRUD, filtros, agrupado, recibo, ticket lines, duplicar
- Categorías, tarjetas: CRUD
- Recurrentes: CRUD, confirmar pago, pausar/activar, totales
- Métricas: tendencia mensual, comparativas, fijos vs variables, por categoría (filtros 7d / mes / 3m / año)
- Presupuesto mensual por moneda
- Cierres de mes
- Salarios
- **Locales comunitarios**: pool global `/places` + copias personales `users/{uid}/places` con `globalPlaceId`; autocompletado al crear un local nuevo

### Modelo de datos — Firestore
```
users/{uid}/
  expenses/{id}
  categories/{id}
  cards/{id}
  places/{id}       ← copia personal; tiene globalPlaceId? y icon?
  recurring/{id}
  salaries/{id}
  monthClosings/{id}

/places/{id}        ← pool global comunitario; nameLower para búsqueda
```

### Convenciones clave
- **Soft delete siempre**: `active: false` + `updatedAt`, nunca borrar documentos
- **Monedas separadas**: USD y UYU nunca se mezclan en un mismo campo numérico
- **Símbolo USD**: mostrar `U$S` (no `$`, que colisiona con UYU)
- **Locale**: `es-UY` para fechas y formato
- **Enum-first**: toda variante de dominio es un enum en `src/types/enums/index.ts`
- **Sin `any`**: TypeScript estricto en todo el codebase
- **React Query**: preferir `setQueryData` sobre `invalidateQueries` en mutaciones para evitar refetch innecesario
- **Firestore rules**: cada vez que cambia el modelo de seguridad, actualizar `firestore.rules` en el repo

### Responsive
- Mobile: header con gradiente verde (`--g800 → --g600`), tabs pill translúcidas
- Desktop: breakpoint `768px`, header limpio sin color, layout 2 columnas donde aplica
- `PageHeader` soporta `rightAction` para colocar filtros/tabs a la derecha del título

---

## 🔄 Sesión anterior — resumen

### Locales comunitarios (feature completa)
- Nuevo modelo: `GlobalPlace { id, name, nameLower, address?, icon?, createdAt }` en `/places`
- `Place` extendido con `globalPlaceId?` e `icon?`
- `IPlacesBackend.searchGlobal(query)` → busca por `nameLower` con range query Firestore (`>= q`, `<= q + '\uf8ff'`)
- Al crear un local sin `globalPlaceId`: primero crea en `/places`, luego copia personal enlazada
- Componente `PlaceNameInput` (`src/features/places/components/`): autocomplete Formik-aware con debounce 250ms
- `firestore.rules`: `/places` → `read, create` para cualquier usuario autenticado; no update/delete
- Mock data: `mockGlobalPlaces` en `src/tests/mocks/data/places.ts`; handler `GET /places/global?q=...`

### Fixes y mejoras previas
- `MetricsPage`: filtro 3m, barra chart mejorada, header desktop igual a `ExpensesPage`, tabs alineadas
- `RecurringPage`: símbolo `U$S` correcto, totales al fondo, banner verde eliminado en desktop
- `SettingsPage`: `PageHeader` removido, sub-módulos usan `PageHeader` con estilos responsive
- `PlacesPage`: tabs de período movidas al `rightAction` del `PageHeader`
- `favicon.svg`: creado en `public/` (emoji 🔥)

---

## 🎯 Próximo paso

**Feature: productos vinculados a locales globales**

La idea es que cada lugar global (`/places/{id}`) pueda tener productos asociados (ej: ítem de menú, producto de supermercado). Modelo análogo al de locales:
- Pool global: `/places/{placeId}/products/{id}` — cualquier usuario autenticado puede leer y crear
- El usuario puede asociar un producto a un gasto al registrarlo

Archivos de partida relevantes:
- `src/types/models/index.ts` — agregar `GlobalProduct`, extender `Place`/`Expense` si aplica
- `src/backend/types.ts` — nuevo `IProductsBackend` o extender `IPlacesBackend`
- `src/backend/firestore/places.ts` — referencia para el patrón global + personal
- `src/features/places/components/PlaceNameInput.tsx` — referencia para patrón de autocomplete

---

## ⚠️ Notas importantes

- **Datos reales en producción** (uso familiar). Toda migración de datos debe ser un script aislado, nunca inline en el código de la app.
- **Deuda técnica prioritaria**: migrar locales privados existentes al pool global (`TECH_DEBT.md` → sección "Migración de locales privados al pool global"). Requiere índice `nameLower ASC` en `/places` y credenciales de admin.
- **Blaze plan pendiente**: la Cloud Function de pagos auto-recurrentes no puede implementarse hasta migrar Firebase al plan Blaze.
- Cuando se agrega una nueva colección Firestore, **siempre** actualizar `firestore.rules`.
- Al implementar un nuevo backend method, **siempre** implementarlo en ambos: `src/backend/firestore/` y `src/backend/msw/`, y agregar el handler en `src/tests/mocks/handlers.ts`.
