// src/features/dashboard/queryEngine.ts
//
// Motor del engine QUERY. Función pura que filtra, agrupa y agrega gastos en
// memoria (mismo patrón que ya usa metrics.ts). No toca backend: recibe la lista
// de gastos ya traída para el período y hace todo client-side. Las monedas nunca
// se mezclan (el filtro por moneda es obligatorio).

import {
  Currency,
  CardType,
  QueryGroupBy,
  QueryAggregate,
  WidgetComparisonType,
  WidgetComparisonRender,
} from '@/types/enums'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Category, Card, Place, QueryConfig, RecurringExpense } from '@/types/models'

// Registro genérico que consume el motor. Un gasto ya lo cumple; los pagos de un
// recurrente se convierten a este shape para poder graficar su evolución.
export interface QueryRecord {
  date: string
  amount: number
  currency: Currency
  categoryIds: string[]
  cardId: string
  placeId?: string
  description: string
}

export interface QueryGroup {
  key: string
  label: string
  value: number
}

export interface QueryComparisonResult {
  render: WidgetComparisonRender
  label: string
  deltaPct?: number
  ratioPct?: number
  caption: string
}

export interface QueryResult {
  currency: Currency
  aggregate: QueryAggregate
  /** Valor agregado sobre todo el conjunto filtrado. */
  total: number
  /** Cantidad de gastos que matchean los filtros. */
  count: number
  /** Grupos (ordenados: tiempo asc, resto por valor desc). Vacío si groupBy = None. */
  groups: QueryGroup[]
  comparison?: QueryComparisonResult
}

export interface QueryLookups {
  categories: Category[]
  cards: Card[]
  places: Place[]
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function parseDate(iso: string): Date {
  // Mediodía para evitar corrimientos por timezone.
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
}

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: date.getUTCFullYear(), week }
}

// Expande un filtro de categorías para incluir las hijas (jerarquía de 2 niveles):
// elegir una categoría padre debe contar también los gastos de sus subcategorías.
function expandCategoryFilter(ids: string[], categories: Category[]): Set<string> {
  const set = new Set(ids)
  for (const c of categories) {
    if (c.parentId && ids.includes(c.parentId)) set.add(c.id)
  }
  return set
}

function matches(e: QueryRecord, cfg: QueryConfig, catFilter: Set<string> | null): boolean {
  if (e.currency !== cfg.currency) return false
  const f = cfg.filters
  if (catFilter && !e.categoryIds.some((id) => catFilter.has(id))) return false
  if (f.cardId && e.cardId !== f.cardId) return false
  if (f.placeId && e.placeId !== f.placeId) return false
  if (f.search && !e.description.toLowerCase().includes(f.search.toLowerCase())) return false
  if (f.amountMin != null && e.amount < f.amountMin) return false
  if (f.amountMax != null && e.amount > f.amountMax) return false
  return true
}

function aggregate(agg: QueryAggregate, amounts: number[]): number {
  if (agg === QueryAggregate.Count) return amounts.length
  if (amounts.length === 0) return 0
  const sum = amounts.reduce((s, a) => s + a, 0)
  switch (agg) {
    case QueryAggregate.Sum:
      return sum
    case QueryAggregate.Avg:
      return sum / amounts.length
    case QueryAggregate.Min:
      return Math.min(...amounts)
    case QueryAggregate.Max:
      return Math.max(...amounts)
    default:
      return sum
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Clave + etiqueta de un bucket temporal a partir de una fecha.
function timeBucket(d: Date, groupBy: QueryGroupBy): { key: string; label: string } {
  if (groupBy === QueryGroupBy.Day) {
    return { key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` }
  }
  if (groupBy === QueryGroupBy.Week) {
    const { year, week } = isoWeek(d)
    return { key: `${year}-W${pad2(week)}`, label: `Sem ${week}` }
  }
  return { key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, label: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` }
}

// Sube por parentId hasta la categoría raíz (con guarda anti-ciclo).
function rootCategory(id: string, categories: Category[]): Category | undefined {
  let c = categories.find((x) => x.id === id)
  const seen = new Set<string>()
  while (c?.parentId && !seen.has(c.id)) {
    seen.add(c.id)
    const parent = categories.find((x) => x.id === c!.parentId)
    if (!parent) break
    c = parent
  }
  return c
}

function groupKeyLabel(e: QueryRecord, groupBy: QueryGroupBy, lk: QueryLookups): { key: string; label: string } {
  switch (groupBy) {
    case QueryGroupBy.Category: {
      const id = e.categoryIds[0]
      const c = id ? lk.categories.find((x) => x.id === id) : undefined
      return { key: id ?? '∅', label: c ? c.name : 'Sin categoría' }
    }
    case QueryGroupBy.CategoryRoot: {
      const id = e.categoryIds[0]
      const root = id ? rootCategory(id, lk.categories) : undefined
      return { key: root?.id ?? id ?? '∅', label: root ? root.name : 'Sin categoría' }
    }
    case QueryGroupBy.Place: {
      const c = e.placeId ? lk.places.find((x) => x.id === e.placeId) : undefined
      return { key: e.placeId ?? '∅', label: c ? c.name : 'Sin lugar' }
    }
    case QueryGroupBy.Card: {
      const c = lk.cards.find((x) => x.id === e.cardId)
      const type = c?.type === CardType.Credit ? 'Crédito' : c?.type === CardType.Debit ? 'Débito' : ''
      return { key: e.cardId || '∅', label: c ? `${type} ${c.bank}`.trim() : 'Sin tarjeta' }
    }
    case QueryGroupBy.Day:
    case QueryGroupBy.Week:
    case QueryGroupBy.Month:
      return timeBucket(parseDate(e.date), groupBy)
    default:
      return { key: 'all', label: 'Total' }
  }
}

const TIME_GROUPS = [QueryGroupBy.Day, QueryGroupBy.Week, QueryGroupBy.Month]

// Inicio de la unidad (mes/semana/día) que contiene a la fecha, a mediodía.
function startOfUnit(d: Date, groupBy: QueryGroupBy): Date {
  if (groupBy === QueryGroupBy.Month) return new Date(d.getFullYear(), d.getMonth(), 1, 12)
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  if (groupBy === QueryGroupBy.Week) {
    const dow = (x.getDay() + 6) % 7 // 0 = lunes
    x.setDate(x.getDate() - dow)
  }
  return x
}

function advanceUnit(d: Date, groupBy: QueryGroupBy): void {
  if (groupBy === QueryGroupBy.Month) d.setMonth(d.getMonth() + 1)
  else if (groupBy === QueryGroupBy.Week) d.setDate(d.getDate() + 7)
  else d.setDate(d.getDate() + 1)
}

// Rellena con ceros los buckets de tiempo desde el primer dato hasta `now`, para
// que el eje sea continuo e incluya el período actual (ej. el mes en curso).
function fillTimeSeries(
  byKey: Map<string, QueryGroup>,
  groupBy: QueryGroupBy,
  minDate: Date,
  now: Date,
): QueryGroup[] {
  const out: QueryGroup[] = []
  const cursor = startOfUnit(minDate, groupBy)
  let guard = 0
  while (cursor.getTime() <= now.getTime() && guard < 500) {
    const { key, label } = timeBucket(cursor, groupBy)
    out.push(byKey.get(key) ?? { key, label, value: 0 })
    advanceUnit(cursor, groupBy)
    guard++
  }
  // Salvaguarda de performance: rango enorme → devolver solo los buckets con datos.
  if (guard >= 500) return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
  return out
}

export function runQuery(
  cfg: QueryConfig,
  records: QueryRecord[],
  lk: QueryLookups,
  now?: Date,
  range?: { start: string; end: string },
): QueryResult {
  const catFilter = cfg.filters.categoryIds?.length
    ? expandCategoryFilter(cfg.filters.categoryIds, lk.categories)
    : null
  // El rango scopea por fecha (los datos vienen sin filtrar por período). Alinea a
  // mes calendario, así los gráficos mensuales incluyen el mes completo del borde.
  const filtered = records.filter(
    (e) => matches(e, cfg, catFilter) && (!range || (e.date >= range.start && e.date <= range.end)),
  )
  const total = aggregate(cfg.aggregate, filtered.map((e) => e.amount))

  let groups: QueryGroup[] = []
  if (cfg.groupBy !== QueryGroupBy.None) {
    const isTime = TIME_GROUPS.includes(cfg.groupBy)
    const map = new Map<string, { label: string; amounts: number[] }>()
    let minDate: Date | null = null
    for (const e of filtered) {
      const { key, label } = groupKeyLabel(e, cfg.groupBy, lk)
      const g = map.get(key) ?? { label, amounts: [] }
      g.amounts.push(e.amount)
      map.set(key, g)
      if (isTime) {
        const d = parseDate(e.date)
        if (!minDate || d < minDate) minDate = d
      }
    }
    groups = [...map.entries()].map(([key, g]) => ({
      key,
      label: g.label,
      value: aggregate(cfg.aggregate, g.amounts),
    }))
    if (isTime) {
      groups.sort((a, b) => a.key.localeCompare(b.key))
      // Zero-fill continuo: desde el inicio del período (si hay rango) o el primer
      // dato, hasta el fin del rango / hoy. Así el eje incluye meses vacíos y el actual.
      const fillStart = range ? parseDate(range.start) : minDate
      const fillEnd = range ? parseDate(range.end) : now
      if (fillStart && fillEnd) {
        const byKey = new Map(groups.map((g) => [g.key, g]))
        groups = fillTimeSeries(byKey, cfg.groupBy, fillStart, fillEnd)
      }
    } else {
      groups.sort((a, b) => b.value - a.value)
    }
  }

  let comparison: QueryComparisonResult | undefined
  const cmp = cfg.comparison
  if (cmp?.type === WidgetComparisonType.Target && cmp.targetValue != null && cmp.targetValue > 0) {
    const t = cmp.targetValue
    comparison =
      cmp.render === WidgetComparisonRender.Progress
        ? { render: WidgetComparisonRender.Progress, label: 'Meta', ratioPct: Math.round((total / t) * 100), caption: `de ${formatCurrency(t, cfg.currency)}` }
        : { render: WidgetComparisonRender.Delta, label: 'Meta', deltaPct: Math.round(((total - t) / t) * 100), caption: formatCurrency(t, cfg.currency) }
  }

  return { currency: cfg.currency, aggregate: cfg.aggregate, total, count: filtered.length, groups, comparison }
}

/** Formatea un valor según el agregado: conteo = número plano; el resto = moneda. */
export function formatQueryValue(value: number, currency: Currency, agg: QueryAggregate): string {
  if (agg === QueryAggregate.Count) return String(Math.round(value))
  return formatCurrency(value, currency)
}

// Convierte el historial de pagos de recurrentes a registros del motor. Cada pago
// es un punto (monto por período); así se puede graficar la evolución de un
// recurrente puntual (o de todos). Filtra a la ventana [start, end].
export function recurringPaymentsToRecords(
  recurring: RecurringExpense[],
  recurringId: string | undefined,
  range: { start: string; end: string },
): QueryRecord[] {
  const items = recurringId ? recurring.filter((r) => r.id === recurringId) : recurring
  const out: QueryRecord[] = []
  for (const r of items) {
    for (const p of r.paymentHistory) {
      const date = p.paidAt ? p.paidAt.slice(0, 10) : `${p.year}-${pad2(p.month)}-01`
      if (date < range.start || date > range.end) continue
      out.push({
        date,
        amount: p.amount,
        currency: p.currency,
        categoryIds: r.categoryIds,
        cardId: r.cardId,
        description: r.name,
      })
    }
  }
  return out
}

/** Reduce los grupos a top-N + "Otros" (para gráficas de torta / barras). */
export function topGroups(groups: QueryGroup[], n: number): QueryGroup[] {
  if (groups.length <= n) return groups
  const head = groups.slice(0, n)
  const rest = groups.slice(n)
  const otros = rest.reduce((s, g) => s + g.value, 0)
  return [...head, { key: '__otros__', label: 'Otros', value: otros }]
}
