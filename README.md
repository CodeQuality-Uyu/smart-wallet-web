# 💰 Smart Wallet

> Gestión de finanzas personales — SPA React + TypeScript con backend intercambiable

---

## 📋 Resumen funcional

SmartWallet permite registrar y analizar gastos personales con soporte para gastos recurrentes, tarjetas, categorías y lugares. Está construida como una SPA desacoplada del backend: el mismo código corre con datos mock en desarrollo o conectado a Firebase en producción, sin cambiar ningún componente.

### Módulos

| Módulo | Capacidades |
|--------|-------------|
| **Expenses** | Registrar, editar y eliminar gastos; agregar líneas de ticket; filtrar por fecha, categoría y lugar |
| **Recurring** | Gestionar pagos recurrentes, cambiar estado activo/inactivo, confirmar pagos mensuales |
| **Categories** | Crear y administrar categorías de gasto con ícono |
| **Places** | Registrar lugares frecuentes con contador de visitas |
| **Cards** | Administrar tarjetas de crédito/débito/transferencia asociadas a gastos |
| **Metrics** | Dashboard de métricas agregadas por período, comparativa vs mes anterior |
| **Reports** | Historial de cierres mensuales y evolución de gastos |

---

## 🚀 Quick Start

### Modo desarrollo (sin backend — datos mock)

```bash
# 1. Clonar y entrar al proyecto
cd smart-wallet

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Asegurarse que VITE_BACKEND=msw en .env.local

# 4. Inicializar MSW (mock service worker)
npx msw init public/ --save

# 5. Levantar
npm run dev
```

La app corre en `http://localhost:5173` con MSW interceptando todas las llamadas. No se necesita ningún backend ni cuenta de Firebase.

### Modo producción (Firebase)

```bash
# 1. Seguir FIREBASE_SETUP.md para crear el proyecto y los servicios
# 2. Completar .env.local con VITE_BACKEND=firestore y las vars VITE_FIREBASE_*
# 3. Reiniciar el servidor
npm run dev
```

> Ver [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) para la guía completa paso a paso.

---

## 📦 Stack técnico

### Frontend

| Herramienta | Rol |
|------------|-----|
| React 18 | UI framework |
| TypeScript (strict) | Tipado estático |
| Vite | Build tool y dev server |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Server state, cache, mutations |
| Formik + Yup | Formularios y validación |
| CSS Modules | Estilos escopados por componente |
| MSW v2 | Mock API (desarrollo y tests) |
| Vitest + React Testing Library | Tests |
| ESLint + Prettier | Calidad de código |

### Backend (Firebase)

| Servicio | Rol |
|----------|-----|
| Firebase Authentication | Autenticación passwordless por email link |
| Firestore | Base de datos NoSQL — persistencia de todos los datos del usuario |
| Firebase Storage | Almacenamiento de comprobantes y recibos adjuntos a gastos |
| Firebase Hosting | CDN global para servir la SPA en producción |

---

## 🔄 Backends intercambiables

La arquitectura separa los componentes de React de la fuente de datos. El backend se selecciona con una variable de entorno — sin cambiar ningún componente ni hook:

```
VITE_BACKEND=msw        → MSW intercepta las llamadas HTTP con datos mock (desarrollo/tests)
VITE_BACKEND=firestore  → Firebase SDK conecta directo a Firestore y Auth (producción)
```

### Cómo funciona internamente

```
Componente / Hook
      ↓
TanStack Query (cache + mutations)
      ↓
src/services/*.ts  ←── única capa que conoce de dónde vienen los datos
      ↓               ↙                    ↘
  VITE_BACKEND=msw           VITE_BACKEND=firestore
  Axios → MSW handler        Firebase SDK → Firestore
  (datos en memoria)         (datos reales en la nube)
```

Los services tienen dos implementaciones bajo el mismo contrato de tipos. El resto del código — hooks, componentes, páginas — no sabe ni le importa cuál está activa.

---

## 🏗️ Arquitectura

```
src/
├── app/
│   ├── config/          # Variables de entorno tipadas (VITE_*) — appConfig
│   ├── providers/       # QueryClient, AuthContext, providers wrapper
│   └── router/          # Rutas y lazy loading
│
├── backend/
│   └── firestore/       # Implementaciones Firebase de cada servicio
│
├── api/
│   └── httpClient.ts    # Axios instance (usado cuando VITE_BACKEND=msw)
│
├── services/            # Contrato de servicios — selecciona la implementación según VITE_BACKEND
│   ├── expensesService.ts
│   ├── categoriesService.ts
│   ├── placesService.ts
│   ├── cardsService.ts
│   ├── recurringService.ts
│   └── metricsService.ts
│
├── features/            # Feature modules (hooks + schemas + components)
│   ├── expenses/
│   ├── recurring/
│   ├── categories/
│   ├── places/
│   └── cards/
│
├── components/
│   ├── ui/              # Button, FormField, LoadingSpinner, ErrorMessage
│   └── shared/          # PageHeader
│
├── pages/               # ExpensesPage, RecurringPage, HomePage, ...
├── layouts/             # AppLayout (mobile bottom nav + desktop top nav) + AuthLayout
├── hooks/               # Cross-feature hooks (useMetrics, useBudget, useIsDesktop)
├── types/
│   ├── enums/           # Enums de dominio centralizados
│   └── models/          # Interfaces + DTOs tipados
│
├── utils/               # formatCurrency, groupByDate
│
└── tests/
    ├── mocks/           # handlers.ts, browser.ts, server.ts, data/
    ├── setup.ts         # Global test setup (MSW node server)
    └── **/*.test.ts/tsx
```

### Principios de arquitectura

- **Backend-agnostic por diseño** — los componentes solo hablan con hooks de TanStack Query. La fuente de datos es un detalle de implementación intercambiable.
- **No hay llamadas HTTP ni SDK calls en componentes** — toda la lógica de acceso a datos vive en `src/services/` y `src/backend/`.
- **Feature-first** — cada feature tiene sus hooks y schemas colocados junto a sus componentes.
- **Enums centralizados** — ningún string union en el código de dominio; todos los valores viven en `src/types/enums/`.
- **MSW como contrato** — los handlers de MSW definen exactamente la forma de los datos; los tests corren contra ellos sin necesidad de red ni Firebase.
- **Responsive by design** — `useIsDesktop` detecta el viewport y renderiza layouts completamente distintos (tabla + sidebar en desktop, cards + bottom nav en mobile).

---

## 🌐 Variables de entorno

Todas las variables expuestas al cliente **deben comenzar con `VITE_`** (requisito de Vite). Nunca leer `import.meta.env` directamente fuera de `src/app/config/index.ts`.

### Modo MSW (desarrollo sin backend)

```env
VITE_BACKEND=msw
VITE_APP_ENV=development
```

### Modo Firebase (producción)

```env
VITE_BACKEND=firestore
VITE_APP_ENV=production

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=smart-wallet-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-wallet-app
VITE_FIREBASE_STORAGE_BUCKET=smart-wallet-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🧪 Tests

```bash
npm run test           # todos los tests
npm run test:coverage  # con reporte de cobertura
npm run test:ui        # UI interactiva de Vitest
```

Los tests corren siempre contra MSW — no necesitan conexión a Firebase ni variables de entorno de producción.

| Tipo | Archivo |
|------|---------|
| Schemas Yup | `expenseSchema.test.ts`, `recurringSchema.test.ts` |
| Utilidades | `formatCurrency.test.ts`, `groupByDate.test.ts` |
| Service layer (MSW) | `expensesService.test.ts` |
| Hooks (TanStack Query) | `useExpenses.test.tsx` |
| Componentes UI | `Button.test.tsx`, `ExpenseListItem.test.tsx`, `CategoryChips.test.tsx` |

---

## ☁️ Deploy

La app compila a un `dist/` estático que puede servirse desde cualquier CDN. Hay dos configuraciones documentadas:

| Opción | Cuándo usarla |
|--------|---------------|
| **Firebase Hosting** | Backend Firebase (Auth + Firestore). Deploy automático con GitHub Actions incluido. |
| **AWS S3 + CloudFront** | Backend en AWS Lambda / API Gateway. |

---

## 🔥 Deploy en Firebase Hosting

Opción recomendada cuando el backend es Firebase. Incluye CDN global, HTTPS automático y SPA routing sin configuración extra.

### Deploy automático (GitHub Actions)

El workflow `.github/workflows/deploy.yml` se dispara en cada `push` a `main`:

1. `npm ci` + `npm run build` con las vars `VITE_FIREBASE_*` inyectadas desde secrets
2. Sube `dist/` a Firebase Hosting en el canal `live`

Secrets necesarios en **Settings → Secrets and variables → Actions**:

```
FIREBASE_SERVICE_ACCOUNT        → JSON de la service account
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

> Ver [FIREBASE_SETUP.md § 8](./FIREBASE_SETUP.md) para obtener el JSON de la service account y configurar el dominio de producción en Authentication.

---

## ☁️ Deploy en AWS (S3 + CloudFront)

### Build

```bash
VITE_API_BASE_URL=https://api.tu-dominio.com/v1 \
VITE_APP_ENV=production \
npm run build
```

### Pasos

1. **S3 Bucket** — habilitar static website hosting, deshabilitar "Block all public access", subir `dist/`

2. **CloudFront** — origin: el bucket S3, redirect HTTP → HTTPS, y configurar error pages (crítico para SPA routing):
   ```
   Error code: 403 → /index.html → HTTP 200
   Error code: 404 → /index.html → HTTP 200
   ```

3. **CI/CD**
   ```yaml
   - name: Build
     run: npm ci && npm run build
     env:
       VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
       VITE_APP_ENV: production

   - name: Deploy to S3
     run: aws s3 sync dist/ s3://smart-wallet-app-frontend --delete

   - name: Invalidate CloudFront
     run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
   ```

---

## 🔮 Mejoras futuras

### UX / Features
- Optimistic updates en creación/edición de gastos
- Filtros avanzados y paginación en lista de gastos
- Exportar reporte mensual a PDF
- PWA / modo offline con Vite PWA plugin
- Notificaciones push para pagos recurrentes próximos a vencer

### Infraestructura
- E2E tests con Playwright
- Internacionalización (i18n) para soporte multi-moneda
