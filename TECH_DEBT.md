# Deuda técnica

Decisiones conocidas que quedaron pendientes por complejidad o prioridad.

---

## TODO — Mejoras y bugs pendientes

### Bugs generales

- [x] En el listado de gastos la fecha muestra el día anterior, no la seteada en el gasto (mobile y desktop)

---

### Inicio

- [x] Resaltar las monedas en las cards, usd y uyu (mobile y desktop)
- [x] Usar símbolo de moneda correspondiente al tipo de moneda (el que está al lado del monto total) (mobile y desktop)
- [x] Sacar el negativo al lado de los números (mobile y desktop)
- [x] Resaltar un poco más el mes en el que está (mobile y desktop)
- [x] La sección de pagos pendientes debe ir a la izquierda del dashboard principal (últimos gastos del mes + cards); tips de ahorro y categorías destacadas ir debajo del dashboard principal (desktop)
- [x] Las cards de pagos pendientes deben cambiar de color al hacer hover, como sucede con los últimos movimientos (desktop)
- [x] Agregar un espaciado pequeño entre el título y la card (mobile y desktop)

---

### Pantalla de gastos

- [ ] Sacar el título "Gastos"
- [ ] El símbolo de moneda debe corresponder al tipo de moneda en las cards de totales
- [ ] Destacar el tipo de moneda en la card
- [ ] Sacar los íconos de las cards de totales (el dólar volando)
- [ ] Mostrar "Marzo 2026" como en inicio
- [ ] Al cambiar el filtrado por fecha, especificar "Desde" y "Hasta"
- [ ] Poder filtrar por tipo de moneda
- [ ] Agregar buscador
- [ ] Agregar agrupaciones
- [ ] Agregar sombreado en el filtro de fecha seleccionado

---

### Pantalla nuevo gasto

- [ ] Al empezar a escribir el monto se debe eliminar el 0
- [ ] A la izquierda del monto mostrar el símbolo de la moneda seleccionada
- [ ] Incrementar un poco el espaciado entre inputs
- [ ] Los placeholders deben ser de color `#acacac` en todos los inputs
- [ ] Agregar label "Agregar nueva modalidad de pago" como en las categorías y lugares
- [ ] Agregar un link "Ver todas las categorías" al lado del título del input de categorías, que redireccione a una pantalla con todas las categorías, buscador y selección
- [ ] En el listado de categorías mostrar solo las top 5 más usadas (elimina cualquier scroll)
- [ ] Eliminar las flechitas al lado de la indicación de creación de la entidad
- [ ] Los mensajes para crear la entidad deben estar al mismo nivel del label del input pero en el extremo derecho
- [ ] Unificar el tamaño de los botones "Cancelar" y "Guardar gasto"
- [ ] Cambiar el ícono del input de fecha por uno similar al resto usado

---

### Pantalla métricas

- [ ] Sacar el título "Métricas"
- [ ] Donde dice "Mes actual" indicar el mes como en las otras pantallas
- [ ] Agregar sombreado al filtrado de tiempo
- [ ] Tendencia mensual: sacar el contenido entre paréntesis en la moneda UYU; agregar el total en las barras para facilitar comparación (tomar como guía Itaú Pagos)
- [ ] Fijos vs Variables: la aclaración "Fijos mensuales + anuales ÷ 12" ponerla entre paréntesis al lado de "Fijos"; los gastos variables no están siendo sumados o incorporados, solo se ven los variables
- [ ] Métrica por categoría: cambiar el ícono del título
- [ ] Métrica gastos fijos: sacarla de métricas y pasarla al módulo de pagos recurrentes

---

### Pantalla configuración

- [ ] Sacar el banner verde junto con la descripción y título; dejar solo los módulos

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
