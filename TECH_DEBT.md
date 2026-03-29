# Deuda técnica

Decisiones conocidas que quedaron pendientes por complejidad o prioridad.

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
