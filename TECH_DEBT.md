# Deuda técnica

Decisiones conocidas que quedaron pendientes por complejidad o prioridad.

---

## TODO — Mejoras y bugs pendientes

### Bugs
Sin bugs detectados
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

- tips y metricas dinamicos
