// src/features/metrics/savingsSuggestions.ts
//
// Pure, data-driven suggestions of where the user could cut spending, derived
// from the metrics summary (current vs previous period, category concentration,
// fixed/recurring costs and "ant expenses"). No AI — just heuristics over the
// numbers already computed. Currencies are never mixed (USD / UYU handled apart).

import { Currency } from '@/types/enums'
import { intervalMonths } from '@/utils/recurringSchedule'
import { formatAmount } from '@/utils/formatCurrency'
import type { MetricsSummary, CategorySpend } from '@/types/models'

export interface SavingsSuggestion {
  id: string
  icon: string
  title: string
  detail: string
  /** Optional estimated monthly saving, already formatted. */
  estimateText?: string
  severity: 'high' | 'medium' | 'info'
}

/**
 * Estado de cada heurística, disparó o no. Sirve para que la UI muestre TODAS
 * las heurísticas que se evalúan (aunque no generen una sugerencia) con el
 * motivo por el que no aplican.
 */
export interface SavingsDiagnostic {
  key: string
  /** Nombre del tópico, ej. "Creció más". */
  heuristic: string
  /** Moneda evaluada (se evalúan por separado). */
  currency: Currency
  /** true si generó una sugerencia. */
  fired: boolean
  /** Si disparó: resumen; si no: por qué no aplica. */
  reason: string
}

export interface SavingsPlan {
  suggestions: SavingsSuggestion[]
  diagnostics: SavingsDiagnostic[]
}

const CURRENCIES: Currency[] = [Currency.UYU, Currency.USD]
const SEVERITY_ORDER: Record<SavingsSuggestion['severity'], number> = { high: 0, medium: 1, info: 2 }

// Only recommend cutting categories that reflect a *repeated* spending habit.
// A large one-off (e.g. paying for dental aligners once) is not something to
// "trim", so categories driven by too few transactions are skipped.
const MIN_REPEAT_COUNT = 3

type CurAmount = Pick<CategorySpend, 'usd' | 'uyu'>

/**
 * Evalúa todas las heurísticas y devuelve las sugerencias que disparan más un
 * diagnóstico por heurística (con el motivo cuando no aplica).
 */
export function computeSavingsPlan(
  m: MetricsSummary,
  currencyFilter: Currency | '',
  maxItems = 5,
): SavingsPlan {
  const out: SavingsSuggestion[] = []
  const diags: SavingsDiagnostic[] = []
  const currencies = currencyFilter ? [currencyFilter] : CURRENCIES

  for (const cur of currencies) {
    const amt = (x: CurAmount): number => (cur === Currency.USD ? x.usd : x.uyu)
    // Conteo de gastos EN ESTA MONEDA. Clave: una categoría puede tener 35 gastos
    // en UYU y 1 en USD; el conteo total mezclaría ambos y marcaría "gasto hormiga"
    // con 36 compras también en dólares, cuando en dólares hubo una sola.
    const cnt = (x: CategorySpend): number =>
      cur === Currency.USD ? x.expenseCountUsd : x.expenseCountUyu
    const totalVar = cur === Currency.USD ? m.variableUsd : m.variableUyu
    if (totalVar <= 0) {
      diags.push({
        key: `novar-${cur}`,
        heuristic: 'Sin gasto variable',
        currency: cur,
        fired: false,
        reason: `No hay gasto variable en ${cur} este período.`,
      })
      continue
    }

    // Razonamos a nivel de categorías raíz: sus totales ya incluyen a las hijas
    // (rollup), y particionan el total sin solaparse. Así no recomendamos padre
    // e hija sobre la misma plata.
    const roots = m.byCategory.filter((c) => !c.parentId)
    const prevMap = new Map(m.previousByCategory.map((c) => [c.categoryId, c]))
    // Hija que más consume dentro de una categoría raíz, para nombrar el driver.
    const topChildOf = (parentId: string): CategorySpend | undefined =>
      m.byCategory
        .filter((c) => c.parentId === parentId && amt(c) > 0)
        .sort((a, b) => amt(b) - amt(a))[0]

    // 1) Fastest-growing root category vs the previous period.
    const rawGrowth = roots
      .map((c) => {
        const prev = prevMap.get(c.categoryId)
        const prevAmt = prev ? amt(prev) : 0
        const prevCount = prev ? cnt(prev) : 0
        const curAmt = amt(c)
        const increase = curAmt - prevAmt
        const pct = prevAmt > 0 ? Math.round((increase / prevAmt) * 100) : curAmt > 0 ? 100 : 0
        return { c, curAmt, prevAmt, prevCount, increase, pct }
      })
      .filter((g) => g.increase > 0 && g.pct >= 25)
      .sort((a, b) => b.increase - a.increase)
    // Solo hábitos repetidos EN ESTA MONEDA, y que ya venían siendo un hábito el
    // período anterior. Si antes casi no había gastos (base ~0), el % se dispara
    // (ej. 6971%) y no es un "gasto que subió" sino una categoría nueva: se descarta.
    const growth = rawGrowth.filter(
      (g) => cnt(g.c) >= MIN_REPEAT_COUNT && g.prevCount >= MIN_REPEAT_COUNT
    )
    if (growth[0]) {
      const g = growth[0]
      // Si es una categoría padre, nombramos la subcategoría que más pesa.
      const driver = topChildOf(g.c.categoryId)
      const driverText = driver
        ? ` Lo que más consume dentro de ${g.c.categoryName} es ${driver.categoryName} (${formatAmount(amt(driver), cur)}).`
        : ''
      out.push({
        id: `growth-${cur}-${g.c.categoryId}`,
        icon: g.c.categoryIcon,
        title: `${g.c.categoryName} subió ${g.pct}%`,
        detail: `Pasaste de ${formatAmount(g.prevAmt, cur)} a ${formatAmount(g.curAmt, cur)} respecto al período anterior. Volver al nivel previo liberaría ${formatAmount(g.increase, cur)}.${driverText}`,
        estimateText: `Ahorro potencial ~${formatAmount(g.increase, cur)}`,
        severity: 'high',
      })
      diags.push({
        key: `growth-${cur}`,
        heuristic: 'Creció más',
        currency: cur,
        fired: true,
        reason: `${g.c.categoryName} +${g.pct}% (${formatAmount(g.prevAmt, cur)} → ${formatAmount(g.curAmt, cur)}).`,
      })
    } else {
      const r = rawGrowth[0]
      let reason: string
      if (!r) reason = 'Ninguna categoría raíz aumentó ≥25% vs. el período anterior.'
      else if (r.prevCount < MIN_REPEAT_COUNT)
        reason = `El mayor aumento es ${r.c.categoryName} (+${r.pct}%), pero antes casi no tenía gastos: es una categoría nueva, no un hábito.`
      else reason = `${r.c.categoryName} aumentó ${r.pct}% pero tiene pocos gastos este período (${cnt(r.c)}).`
      diags.push({ key: `growth-${cur}`, heuristic: 'Creció más', currency: cur, fired: false, reason })
    }

    // 2) Root category that concentrates most of the variable spending — pero
    // solo si es un gasto ALTO y SOSTENIDO, no un pago puntual que hizo explotar
    // la categoría este mes. Requiere que el período anterior también viniera alto.
    const top = roots
      .filter((c) => amt(c) > 0 && cnt(c) >= MIN_REPEAT_COUNT)
      .sort((a, b) => amt(b) - amt(a))[0]
    {
      let fired = false
      let reason: string
      if (!top) {
        reason = `Ninguna categoría con gasto recurrente (≥${MIN_REPEAT_COUNT} compras) en ${cur}.`
      } else {
        const share = Math.round((amt(top) / totalVar) * 100)
        const prevTop = prevMap.get(top.categoryId)
        const prevAmt = prevTop ? amt(prevTop) : 0
        // Sostenido: el período anterior ya venía en al menos el 60% del nivel actual.
        const sustained = prevAmt >= amt(top) * 0.6
        if (share >= 30 && sustained) {
          fired = true
          const cut = amt(top) * 0.1
          const driver = topChildOf(top.categoryId)
          const driverText = driver
            ? ` El mayor consumo dentro es ${driver.categoryName} (${formatAmount(amt(driver), cur)}).`
            : ''
          out.push({
            id: `top-${cur}-${top.categoryId}`,
            icon: top.categoryIcon,
            title: `${top.categoryName} concentra el ${share}% de tu gasto`,
            detail: `Es tu mayor gasto variable (${formatAmount(amt(top), cur)}) y se viene manteniendo alto (período anterior: ${formatAmount(prevAmt, cur)}). Recortarlo aunque sea un 10% tiene impacto directo.${driverText}`,
            estimateText: `Ahorro potencial ~${formatAmount(cut, cur)}`,
            severity: 'medium',
          })
          reason = `${top.categoryName} concentra ${share}% y se mantiene.`
        } else if (share < 30) {
          reason = `${top.categoryName} es la mayor (${share}%) pero no supera el 30% del gasto variable.`
        } else {
          reason = `${top.categoryName} concentra ${share}% pero es un pico puntual (antes ${formatAmount(prevAmt, cur)}).`
        }
      }
      diags.push({ key: `top-${cur}`, heuristic: 'Concentra el gasto', currency: cur, fired, reason })
    }

    // 3) Fixed / recurring costs — review subscriptions.
    const fixed = m.fixedBreakdown.filter((f) => f.currency === cur)
    {
      let fired = false
      let reason: string
      if (fixed.length === 0) {
        reason = `Sin pagos recurrentes en ${cur}.`
      } else {
        const monthlyFixed = fixed.reduce((s, f) => s + f.amount / intervalMonths(f.frequency), 0)
        const denom = totalVar + monthlyFixed
        const shareOfTotal = denom > 0 ? Math.round((monthlyFixed / denom) * 100) : 0
        if (fixed.length >= 3 || shareOfTotal >= 40) {
          fired = true
          const names = [...fixed]
            .sort((a, b) => b.amount / intervalMonths(b.frequency) - a.amount / intervalMonths(a.frequency))
            .slice(0, 3)
            .map((f) => f.name)
            .join(', ')
          out.push({
            id: `fixed-${cur}`,
            icon: '🔁',
            title: `Revisá tus pagos fijos (${formatAmount(monthlyFixed, cur)}/mes)`,
            detail: `Tenés ${fixed.length} pagos recurrentes activos${names ? ` como ${names}` : ''}, equivalentes al ${shareOfTotal}% de tu gasto mensual. Pausar los que no uses baja tu costo fijo.`,
            severity: shareOfTotal >= 50 ? 'high' : 'info',
          })
          reason = `${fixed.length} recurrentes, ${shareOfTotal}% del gasto.`
        } else {
          reason = `${fixed.length} recurrente(s), ${shareOfTotal}% del gasto — por debajo del umbral (3 pagos o 40%).`
        }
      }
      diags.push({ key: `fixed-${cur}`, heuristic: 'Pagos fijos', currency: cur, fired, reason })
    }

    // 4) "Ant expenses" — muchas compras chicas EN ESTA MONEDA en una raíz.
    // Usa el conteo por moneda: una categoría con 35 gastos en pesos y 1 en dólares
    // no debe marcarse como gasto hormiga en dólares.
    const ant = roots
      .filter((c) => amt(c) > 0 && cnt(c) >= 10)
      .sort((a, b) => cnt(b) - cnt(a))[0]
    {
      let fired = false
      let reason: string
      if (ant) {
        fired = true
        const antCount = cnt(ant)
        const avgTicket = amt(ant) / antCount
        // Subcategoría que aporta MÁS compras (el problema del gasto hormiga es la
        // frecuencia, así que el driver es la hija con más gastos, no la de mayor monto).
        const driver = m.byCategory
          .filter((c) => c.parentId === ant.categoryId && cnt(c) > 0)
          .sort((a, b) => cnt(b) - cnt(a))[0]
        const driverText = driver
          ? ` La mayoría vienen de ${driver.categoryName} (${cnt(driver)} compra${cnt(driver) !== 1 ? 's' : ''}).`
          : ''
        out.push({
          id: `ant-${cur}-${ant.categoryId}`,
          icon: '🐜',
          title: `Gasto hormiga en ${ant.categoryName}`,
          detail: `${antCount} compras este período (promedio ${formatAmount(avgTicket, cur)} c/u) que suman ${formatAmount(amt(ant), cur)}. Espaciar la frecuencia acumula ahorro.${driverText}`,
          estimateText: `Ahorro potencial ~${formatAmount(amt(ant) * 0.15, cur)}`,
          severity: 'info',
        })
        reason = `${ant.categoryName} (${antCount} compras).`
      } else {
        const maxCnt = roots.filter((c) => amt(c) > 0).reduce((mx, c) => Math.max(mx, cnt(c)), 0)
        reason = `Ninguna categoría con ≥10 compras en ${cur} (máximo: ${maxCnt}).`
      }
      diags.push({ key: `ant-${cur}`, heuristic: 'Gasto hormiga', currency: cur, fired, reason })
    }
  }

  const suggestions = out
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, maxItems)
  return { suggestions, diagnostics: diags }
}

export function computeSavingsSuggestions(
  m: MetricsSummary,
  currencyFilter: Currency | '',
  maxItems = 5,
): SavingsSuggestion[] {
  return computeSavingsPlan(m, currencyFilter, maxItems).suggestions
}
