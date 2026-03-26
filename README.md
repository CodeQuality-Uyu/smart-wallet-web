# 💰 Smart Wallet

> Gestión de finanzas personales — Frontend SPA React + TypeScript

---

## 📋 Resumen funcional

SmartWallet permite registrar y analizar gastos personales con soporte para gastos recurrentes, tarjetas, categorías y lugares.

### Módulos

| Módulo | Capacidades |
|--------|-------------|
| **Expenses** | Registrar, editar y eliminar gastos; agregar líneas de ticket; filtrar por fecha, categoría y lugar |
| **Recurring** | Gestionar pagos recurrentes, cambiar estado activo/inactivo, confirmar pagos mensuales |
| **Categories** | Crear y administrar categorías de gasto con color |
| **Places** | Registrar lugares frecuentes con contador de visitas |
| **Cards** | Administrar tarjetas de crédito/débito asociadas a gastos |
| **Metrics** | Dashboard de métricas agregadas por período |

---

## 🚀 Quick Start

```bash
# 1. Clonar y entrar al proyecto
cd smart-wallet

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local

# 4. Inicializar MSW (mock service worker)
npx msw init public/ --save

# 5. Levantar en modo desarrollo (con mock API)
npm run dev
```

La app corre en `http://localhost:5173` con MSW interceptando todas las llamadas HTTP.

---

## 📦 Stack técnico

| Herramienta | Rol |
|------------|-----|
| React 18 | UI framework |
| TypeScript (strict) | Tipado estático |
| Vite | Build tool y dev server |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Server state, cache, mutations |
| Formik + Yup | Formularios y validación |
| Axios | HTTP client |
| MSW v2 | Mock API (desarrollo y tests) |
| Vitest | Test runner |
| React Testing Library | Tests de componentes |
| ESLint + Prettier | Calidad de código |

---

## 🏗️ Arquitectura

```
src/
├── app/
│   ├── config/          # Variables de entorno tipadas (VITE_*) — appConfig
│   ├── providers/       # QueryClient, providers wrapper
│   └── router/          # Rutas y lazy loading
│
├── api/                 # Capa HTTP desacoplada
│   └── httpClient.ts    # Axios instance centralizada con interceptors
│
├── services/            # Funciones puras de API — único lugar para llamadas HTTP
│   ├── expensesService.ts
│   ├── categoriesService.ts
│   ├── placesService.ts
│   ├── cardsService.ts
│   ├── recurringService.ts
│   └── metricsService.ts
│
├── features/            # Feature modules (hooks + schemas + components)
│   ├── expenses/        # useExpenses, ExpenseForm, CategoryChips, ExpenseListItem
│   ├── recurring/       # useRecurring, recurringSchema, confirmPaymentSchema
│   ├── categories/      # useCategories, categorySchema
│   ├── places/          # usePlaces, placeSchema
│   └── cards/           # useCards, cardSchema
│
├── components/
│   ├── ui/              # Button, FormField, LoadingSpinner, ErrorMessage
│   └── shared/          # PageHeader
│
├── pages/               # ExpensesPage, RecurringPage, CategoriesPage, ...
├── layouts/             # AppLayout (bottom nav) + AuthLayout
├── hooks/               # Cross-feature hooks (useMetrics)
├── types/
│   ├── enums/           # AppEnv
│   └── models/          # Interfaces + DTOs tipados
│
├── utils/               # formatCurrency, groupByDate
│
└── tests/
    ├── mocks/           # handlers.ts, browser.ts, server.ts, data/
    ├── setup.ts         # Global test setup (MSW node server)
    └── **/*.test.ts/tsx # Tests de componentes, hooks, servicios, schemas
```

### Principios de arquitectura

- **No hay llamadas HTTP en componentes** — toda la comunicación con la API pasa por hooks de TanStack Query que delegan a funciones puras en `src/services/`.
- **Separación de concerns** — la capa `services/` es independiente de React; puede testearse sin renderizar nada.
- **Feature-first** — cada feature tiene sus hooks y schemas colocados junto a sus componentes.
- **Enums centralizados** — ningún string union en el código; todos los valores de dominio viven en `src/types/enums/`.
- **MSW como contrato** — los handlers de MSW reflejan exactamente la API REST esperada; reemplazar el mock por el backend real no requiere cambios en componentes.

---

## 🔌 Contrato REST API

```
GET    /expenses
GET    /expenses/:id
POST   /expenses
PATCH  /expenses/:id
DELETE /expenses/:id
POST   /expenses/:id/ticket-lines
DELETE /expenses/:id/ticket-lines/:lineId

GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id

GET    /places
POST   /places
PATCH  /places/:id
DELETE /places/:id

GET    /cards
POST   /cards
PATCH  /cards/:id
DELETE /cards/:id

GET    /recurring
GET    /recurring/:id
POST   /recurring
PATCH  /recurring/:id
PATCH  /recurring/:id/status
DELETE /recurring/:id
POST   /recurring/:id/confirm-payment

GET    /metrics
```

---

## 🌐 Variables de entorno

Todas las variables expuestas al cliente **deben comenzar con `VITE_`** (requisito de Vite).

```env
VITE_API_BASE_URL=https://api.tu-dominio.com/v1  # URL base del backend
VITE_APP_ENV=production                           # development | staging | production
VITE_ENABLE_MSW=false                             # true solo en development
```

Nunca leer `import.meta.env` directamente fuera de `src/app/config/index.ts`.

---

## 🧪 Tests

```bash
# Correr todos los tests
npm run test

# Con cobertura
npm run test:coverage

# UI interactiva
npm run test:ui
```

### Cobertura de tests

| Tipo | Archivo |
|------|---------|
| Schemas Yup | `expenseSchema.test.ts`, `recurringSchema.test.ts` |
| Utilidades | `formatCurrency.test.ts`, `groupByDate.test.ts` |
| Service layer (MSW) | `expensesService.test.ts` |
| Hooks (TanStack Query) | `useExpenses.test.tsx` |
| Componentes UI | `Button.test.tsx`, `ExpenseListItem.test.tsx`, `CategoryChips.test.tsx` |

---

## ☁️ Deploy en AWS (S3 + CloudFront)

### Build

```bash
npm run build
# Output en ./dist/
```

### Pasos

1. **S3 Bucket**
   - Crear bucket: `smart-wallet-app-frontend`
   - Habilitar "Static website hosting"
   - Deshabilitar "Block all public access"
   - Subir todo el contenido de `dist/` manteniendo la estructura

2. **CloudFront Distribution**
   - Origin: el bucket S3
   - Redirect HTTP → HTTPS
   - Cache behaviors: cachear assets estáticos (`/assets/*`) con TTL largo
   - **Configurar error pages** (crítico para SPA routing):

   ```
   Error code: 403 → Response path: /index.html → HTTP 200
   Error code: 404 → Response path: /index.html → HTTP 200
   ```

   Sin esta configuración, los refresh directos en rutas como `/expenses/123` devuelven 403/404 de S3.

3. **Variables de entorno en build**
   ```bash
   VITE_API_BASE_URL=https://api.tu-dominio.com/v1 \
   VITE_APP_ENV=production \
   VITE_ENABLE_MSW=false \
   npm run build
   ```

4. **CI/CD (GitHub Actions — ejemplo)**
   ```yaml
   - name: Build
     run: npm ci && npm run build
     env:
       VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
       VITE_APP_ENV: production
       VITE_ENABLE_MSW: false

   - name: Deploy to S3
     run: aws s3 sync dist/ s3://smart-wallet-app-frontend --delete

   - name: Invalidate CloudFront
     run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
   ```

---

## 🔮 Mejoras futuras

### Autenticación real
- Integrar JWT en los interceptors de Axios (`httpClient.ts` ya tiene el hook para el token)
- Implementar login con Amazon Cognito o Auth0

### Backend serverless
- Los handlers de MSW son el contrato exacto → implementar en AWS Lambda + API Gateway
- DynamoDB o RDS para persistencia de expenses, categories, cards y recurring

### UX / Features
- Optimistic updates en creación/edición de gastos
- Filtros avanzados y paginación en lista de gastos
- Exportar reporte mensual a PDF
- PWA / modo offline con Vite PWA plugin
- Notificaciones para pagos recurrentes próximos a vencer

### Infraestructura
- E2E tests con Playwright
- SSR con Next.js si el SEO pasa a ser relevante
- Internacionalización (i18n) para soporte multi-moneda
