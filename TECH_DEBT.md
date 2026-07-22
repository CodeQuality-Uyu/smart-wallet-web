# Deuda técnica

Decisiones conocidas que quedaron pendientes por complejidad o prioridad.

---

## TODO — Mejoras y bugs pendientes

### Bugs
Sin bugs detectados
---

### Migrar heurísticas de recorte a "recortes dinámicos"

`src/features/metrics/savingsSuggestions.ts` contiene heurísticas hardcodeadas
(crecimiento vs período anterior, concentración, costos fijos, gasto hormiga).
El feature de **recortes** (`src/features/recortes/`, `src/services/recorteAnalysisService.ts`)
generaliza esa idea: el usuario define el indicador con un prompt y Gemini lo calcula
sobre los mismos datos. Cuando los recortes cubran los casos que hoy resuelven las
heurísticas de forma confiable, eliminar `savingsSuggestions.ts` y su card, dejando
que los recortes (con plantillas seed en `recorteConstants.ts`) los reemplacen.

---

### Recortes: `spend_by_product_category` ignora el acote por categoría de gasto

En el function calling de recortes (`src/services/recorteTools.ts`) conviven dos
taxonomías distintas: **categorías de gasto** (etiqueta del gasto entero, con las que
el usuario acota un recorte vía `categoryIds`) y **categorías de producto** (etiqueta
de cada línea de ticket, ej. Lácteos/Limpieza).

La función `spend_by_product_category` sale de `metrics.byProductCategory`, que es un
agregado del **período completo**: **NO** respeta el acote por categoría de gasto del
recorte. En cambio, `list_ticket_lines` sí lo respeta (se arma desde `inRange`, ya
filtrado por scope). Resultado: en un recorte acotado por categoría de gasto, el total
por categoría de producto es "de todo el período" mientras los ejemplos de líneas son
"solo del scope" — incoherente.

- **Impacto**: bajo. Solo se nota si el usuario combina las dos cosas (acotar por
  categoría de gasto *y* preguntar por categoría de producto); ahí el monto sale más
  alto de lo esperado. En el caso normal (recorte de productos sin acote de gasto) es correcto.
- **Fix**: calcular `byProductCategory` desde las líneas de ticket acotadas (`inRange`)
  en vez de `metrics.byProductCategory`. Queda coherente con el scope, pero pierde las
  líneas sin `productId` o sin categoría de producto asignada (solo suma lo bien clasificado).
- **Decisión actual**: se dejó period-wide (más completo) a favor de la cobertura.

---

## Cloud Function: historial de pagos automáticos

**Contexto**
Los pagos recurrentes en modo `Auto` (Netflix, Spotify, etc.) no generan entradas en `paymentHistory` porque no hay integración bancaria — la app no sabe cuándo se debita realmente la tarjeta.

Hoy, `currentMonthStatus` se resuelve en el frontend como `Paid` para todos los recurrentes Auto activos, pero el historial queda vacío indefinidamente.

**Solución propuesta**
Una Cloud Function programada que corra el día 1 de cada mes y registre automáticamente el pago del mes para todos los recurrentes `mode == auto` y `status == active`:

```ts
// functions/src/index.ts
export const registerAutoRecurring = onSchedule('0 6 1 * *', async () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const usersSnap = await db.collection('users').get()

  for (const userDoc of usersSnap.docs) {
    const recurringSnap = await userDoc.ref
      .collection('recurring')
      .where('mode', '==', 'auto')
      .where('status', '==', 'active')
      .get()

    for (const rec of recurringSnap.docs) {
      const data = rec.data()
      const alreadyRegistered = (data.paymentHistory ?? [])
        .some((h: { month: number; year: number }) => h.month === month && h.year === year)

      if (alreadyRegistered) continue

      await rec.ref.update({
        paymentHistory: FieldValue.arrayUnion({
          id: db.collection('_').doc().id,
          month, year,
          amount: data.amount,
          currency: data.currency,
          paidAt: now.toISOString(),
          status: 'paid',
        }),
        updatedAt: now.toISOString(),
      })
    }
  }
})
```

**Requisitos previos**
- Migrar proyecto Firebase al plan **Blaze** (pago por uso, costo prácticamente cero para uso personal)
- Crear índice compuesto en Firestore: `recurring` → `mode ASC, status ASC` (Firebase genera el link al primer fallo de query)
- Inicializar `functions/` con `firebase init functions` y TypeScript

**Impacto estimado**: bajo — función aislada, no toca código existente del frontend.

---

## Filtros de gastos deben moverse al backend

**Contexto**
En `ExpensesPage`, todos los filtros (búsqueda, moneda, medio de pago, comercio, categoría) y el agrupado (día/semana/lugar/categoría) se aplican client-side mediante `useMemo` después de recibir todos los gastos del período. El backend solo recibe `{ period }`.

Esto funciona bien para datasets pequeños pero escala mal.

**Solución propuesta**
Pasar todos los filtros activos a `useExpenses(filters)` y procesarlos en cada backend:

- **MSW** (`handlers.ts`): leer query params en `GET /api/expenses` y filtrar `mockExpenses` antes de responder.
- **Firestore** (`firestore/expenses.ts`): ya tiene stubs para `currency`, `placeId` y `categoryIds` — extender con `cardId` y `search`. Puede requerir índices compuestos en Firestore.
- **Página**: eliminar el `useMemo` de filtrado y dejar solo el agrupado client-side (o también delegarlo via `groupBy` param).

**Impacto estimado**: medio — afecta `ExpensesPage`, `useExpenses`, ambos backends y potencialmente requiere migración de índices en Firestore.

---

## `pendingLines` de los documentos se cargan enteras en el listado de Reportes

**Contexto**
Las líneas extraídas de cada estado de cuenta (`ReportAttachment.pendingLines`) se guardan como un array **dentro del mismo documento** `users/{uid}/reportAttachments/{id}`. `useReportAttachments(mes)` hace un `getDocs` de todos los documentos del mes, así que el listado de "Documentos del mes" en `ReportsPage` trae **todas las líneas de todos los documentos**, aunque solo se usen para:
- Derivar el contador del badge **"✓ Procesado (N gastos)"** (`pendingLines.filter(l => l.imported).length`).
- Derivar el contador **"Revisar (N)"** (`pendingLines.filter(l => !l.imported).length`).

El modal (`StatementImportModal`) reusa ese mismo objeto, no hace un fetch aparte.

Con uso familiar (pocos documentos por mes, ~40 líneas c/u) el payload es chico y no se nota. Pero escala mal: cada documento puede cargar decenas de líneas con descripción, montos, categoría, etc. solo para mostrar dos números en el feed.

**Por qué quedó así**
El `importedExpenseCount` original era un contador guardado, pero se calculaba mal (usaba un snapshot desactualizado de `existingExpenses` en `handleSave`), quedando congelado (ej. mostraba `5` cuando había ~40 líneas importadas). Se resolvió derivando el número en vivo de `pendingLines`, que ya venía en la lista — correcto pero pesado.

**Solución propuesta**
1. Mantener contadores livianos y **bien calculados** en el documento (ej. `importedLineCount` y `pendingLineCount`), actualizados en cada guardado contando `pendingLines` en el momento del `savePendingLines`/`markProcessed`.
2. **No** traer `pendingLines` en `useReportAttachments` (proyección de campos o subcolección) — cargarlas solo al abrir el modal.
   - Opción: mover las líneas a subcolección `reportAttachments/{id}/lines` y dejar solo contadores en el doc padre.

**Impacto estimado**: bajo-medio — afecta `ReportsPage`, `useReportAttachments`, `reportAttachmentsService`, ambos backends (`firestore/reportAttachments`, `msw/reportAttachments` + handlers) y el modelo. Requiere mantener los contadores en sincronía en todos los caminos de escritura (guardar, importar, eliminar línea, reprocesar).

---

## Migración de locales privados al pool global

**Contexto**
Los locales creados antes de implementar el modelo comunitario viven en `users/{uid}/places` sin `globalPlaceId` y sin entrada en `/places`. El autocompletado no los muestra para otros usuarios, y el propio usuario no los ve vinculados al pool.

**Solución propuesta**
Script de migración one-shot (Cloud Function o script Node admin):

```ts
// scripts/migrate-places.ts
const usersSnap = await db.collection('users').get()
const globalIndex = new Map<string, string>() // nameLower → globalPlaceId

for (const user of usersSnap.docs) {
  const placesSnap = await user.ref
    .collection('places')
    .where('active', '==', true)
    .get()

  for (const place of placesSnap.docs) {
    const data = place.data()
    if (data['globalPlaceId']) continue // ya migrado

    const key = (data['name'] as string).toLowerCase().trim()

    let globalId = globalIndex.get(key)
    if (!globalId) {
      // Buscar si ya existe en el pool global
      const existing = await db.collection('places')
        .where('nameLower', '==', key)
        .limit(1)
        .get()

      if (!existing.empty) {
        globalId = existing.docs[0]!.id
      } else {
        // Crear entrada global nueva
        const ref = await db.collection('places').add({
          name: data['name'],
          nameLower: key,
          ...(data['address'] ? { address: data['address'] } : {}),
          ...(data['icon'] ? { icon: data['icon'] } : {}),
          createdAt: new Date().toISOString(),
        })
        globalId = ref.id
      }
      globalIndex.set(key, globalId)
    }

    await place.ref.update({ globalPlaceId: globalId })
  }
}
```

**Requisitos previos**
- Índice en `/places`: campo `nameLower ASC` (necesario para el `where` de deduplicación)
- Ejecutar con credenciales de admin (Service Account), no desde el cliente

**Impacto estimado**: bajo — script aislado, no toca código existente. Ejecutar una sola vez en producción.

---

## Cobertura de tests insuficiente

**Contexto**
El proyecto tiene ~21% de cobertura. Los tests existentes cubren bien utilidades y algunos schemas, pero la mayoría de la lógica de negocio no tiene tests.

**Estado al 2026-04-05**

| Categoría | Total | Con test | Cobertura |
|---|---|---|---|
| Utilidades | 3 | 3 | 100% |
| Schemas | 6 | 4 | 67% |
| Componentes | 15 | 4 | 27% |
| Hooks | 14 | 2 | 14% |
| Servicios | 17 | 2 | 12% |
| Páginas | 27 | 0 | 0% |

**Con test actualmente**
- Utilidades: `formatCurrency`, `groupByDate`, `getPriceDataConfidence`
- Schemas: `expenseSchema`, `recurringSchema`, `brandSchema`, `productSchema`
- Hooks: `useExpenses`, `useProducts`
- Servicios: `expensesService`, `productsService`
- Componentes: `Button`, `CategoryChips`, `ExpenseListItem`, `BrandAutocomplete`

**Sin test — prioridad alta**
- Schemas: `cardSchema`, `categorySchema`, `placeSchema`, `productCategorySchema`
- Servicios: `authService`, `budgetService`, `cardsService`, `categoriesService`, `placesService`, `recurringService`, `metricsService`, `monthClosingsService`, `salariesService`, `brandsService`
- Hooks: `useBudget`, `useMetrics`, `useRecurring`, `usePlaces`, `useCategories`, `useCards`, `useMonthClosings`

**Sin test — prioridad media**
- Componentes con lógica: `ExpenseForm`, `ProductForm`, `PlaceNameInput`, `CategoryPickerModal`, `ProductNameInput`, `PriceHistoryChart`
- Primitivos UI: `Modal`, `FormField`, `PageHeader`

**Sin test — prioridad baja**
- Páginas (27 en total) — son integración de componentes ya testeables individualmente

**Impacto estimado**: alto esfuerzo, bajo riesgo de regresión — es trabajo aditivo que no toca código existente.
