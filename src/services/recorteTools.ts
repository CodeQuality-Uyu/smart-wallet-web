// src/services/recorteTools.ts
// Funciones (tools) que Gemini puede llamar para consultar los datos del recorte,
// más el "bundle" de datos precargado que las alimenta. Todas son read-only y
// operan dentro del rango/scope fijo del recorte (el modelo no puede salirse de él).

import { metricsService } from '@/services/metricsService'
import { expensesService } from '@/services/expensesService'
import { placesService } from '@/services/placesService'
import { productsService } from '@/services/productsService'
import { productCategoriesService } from '@/services/productCategoriesService'
import { periodLabel } from '@/features/recortes/recorteConstants'
import { Currency } from '@/types/enums'
import type {
  Recorte,
  RecorteDataSnapshot,
  RecorteSnapshotPlace,
  CategorySpend,
} from '@/types/models'

const MAX_EXPENSE_SAMPLE = 60
const MAX_LIST_EXPENSES = 40

/** Un gasto en forma legible (para el panel y para `list_expenses`). */
export interface RecorteSampleItem {
  description: string
  amount: number
  currency: Currency
  date: string
  categories: string[]
  place: string | null
}

/** Una línea de ticket (ítem de una compra) en forma legible. */
export interface RecorteTicketLine {
  item: string
  amount: number
  currency: Currency
  date: string
  place: string | null
  product: string | null
  productCategory: string | null
}

export interface RecorteBundle {
  /** Agregados a persistir + mostrar en el panel. */
  snapshot: RecorteDataSnapshot
  /** Muestra acotada (para el panel). */
  sample: RecorteSampleItem[]
  // ── internos que alimentan las tools ──
  /** Categorías dentro del scope, con id/parentId (para spend_total exacto). */
  scopedCategories: CategorySpend[]
  /** nombre en minúsculas → categoryId. */
  idByName: Map<string, string>
  byPlace: RecorteSnapshotPlace[]
  /** Todos los gastos del rango (legibles), para list_expenses. */
  expenses: RecorteSampleItem[]
  /** Todas las líneas de ticket del rango (legibles), para list_ticket_lines. */
  ticketLines: RecorteTicketLine[]
  /** Catálogo de productos del usuario. */
  products: { name: string; category: string; pricingType: string }[]
  /** Categorías de producto del usuario. */
  productCategories: { name: string; icon: string }[]
  variableUyu: number
  variableUsd: number
  scopedTotalUyu?: number
  scopedTotalUsd?: number
}

/** Carga métricas + gastos + locales del recorte y arma el bundle (sin llamar a Gemini). */
export async function loadRecorteBundle(recorte: Recorte): Promise<RecorteBundle> {
  const metrics = await metricsService.getSummary(recorte.period)
  const nameById = new Map(metrics.byCategory.map((c) => [c.categoryId, c.categoryName]))

  const selectedIds = recorte.categoryIds?.length ? new Set(recorte.categoryIds) : null
  const inScope = (c: CategorySpend): boolean =>
    !selectedIds || selectedIds.has(c.categoryId) || (c.parentId ? selectedIds.has(c.parentId) : false)
  const scopeIds = new Set(metrics.byCategory.filter(inScope).map((c) => c.categoryId))

  const [{ data: allExpenses }, places, userProducts, productCats] = await Promise.all([
    expensesService.list({ period: recorte.period }),
    placesService.list(),
    productsService.list(),
    productCategoriesService.list(),
  ])
  const placeNameById = new Map(places.map((p) => [p.id, p.name]))
  const prodCatNameById = new Map(productCats.map((c) => [c.id, c.name]))
  const productById = new Map(
    userProducts.map((p) => [
      p.id,
      { name: p.name, category: prodCatNameById.get(p.productCategoryId) ?? null },
    ]),
  )
  const since = recorte.sinceDate
  const inRange = allExpenses.filter(
    (e) =>
      (since ? e.date >= since : true) &&
      (!selectedIds || e.categoryIds.some((id) => scopeIds.has(id))),
  )

  const placeName = (id?: string): string | null =>
    id ? (placeNameById.get(id) ?? 'Local desconocido') : null

  const expenses: RecorteSampleItem[] = inRange.map((e) => ({
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    date: e.date,
    categories: e.categoryIds.map((id) => nameById.get(id) ?? id),
    place: placeName(e.placeId),
  }))
  const sample = expenses.slice(0, MAX_EXPENSE_SAMPLE)

  // Líneas de ticket (ítems de cada compra) del rango, con producto y su categoría.
  const ticketLines: RecorteTicketLine[] = []
  for (const e of inRange) {
    for (const line of e.ticketLines) {
      const prod = line.productId ? productById.get(line.productId) : undefined
      ticketLines.push({
        item: line.name,
        amount: line.amount,
        currency: e.currency,
        date: e.date,
        place: placeName(e.placeId),
        product: prod?.name ?? null,
        productCategory: prod?.category ?? null,
      })
    }
  }

  const products = userProducts
    .filter((p) => p.active !== false)
    .map((p) => ({
      name: p.name,
      category: prodCatNameById.get(p.productCategoryId) ?? '',
      pricingType: String(p.pricingType),
    }))
  const productCategories = productCats.map((c) => ({ name: c.name, icon: c.icon }))
  const byProductCategory = metrics.byProductCategory.map((pc) => ({
    name: pc.productCategoryName,
    uyu: pc.uyu,
    usd: pc.usd,
  }))

  // Gasto por local (cada gasto = una visita), ordenado por visitas.
  const placeAgg = new Map<string, RecorteSnapshotPlace>()
  for (const e of inRange) {
    if (!e.placeId) continue
    const entry = placeAgg.get(e.placeId) ?? {
      name: placeNameById.get(e.placeId) ?? 'Local desconocido',
      uyu: 0,
      usd: 0,
      count: 0,
    }
    entry.count += 1
    if (e.currency === Currency.USD) entry.usd += e.amount
    else entry.uyu += e.amount
    placeAgg.set(e.placeId, entry)
  }
  const byPlace = [...placeAgg.values()].sort((a, b) => b.count - a.count).slice(0, 20)

  // Total exacto acotado (dedup padre/hija).
  let scopedUyu = 0
  let scopedUsd = 0
  if (selectedIds) {
    for (const c of metrics.byCategory) {
      if (!selectedIds.has(c.categoryId)) continue
      if (c.parentId && selectedIds.has(c.parentId)) continue
      scopedUyu += c.uyu
      scopedUsd += c.usd
    }
  }

  const scopedCategories = metrics.byCategory.filter(inScope)
  const idByName = new Map(scopedCategories.map((c) => [c.categoryName.toLowerCase(), c.categoryId]))
  const scopeNames = selectedIds ? [...selectedIds].map((id) => nameById.get(id) ?? id) : []

  const snapshot: RecorteDataSnapshot = {
    periodLabel: periodLabel(recorte),
    ...(selectedIds
      ? { scopeCategories: scopeNames, scopedTotalUyu: scopedUyu, scopedTotalUsd: scopedUsd }
      : {}),
    variableUyu: metrics.variableUyu,
    variableUsd: metrics.variableUsd,
    fixedUyu: metrics.fixedUyu,
    fixedUsd: metrics.fixedUsd,
    previousVariableUyu: metrics.previousPeriodUyu,
    previousVariableUsd: metrics.previousPeriodUsd,
    byCategory: scopedCategories.map((c) => ({
      name: c.categoryName,
      uyu: c.uyu,
      usd: c.usd,
      count: c.expenseCount,
    })),
    recurring: metrics.fixedBreakdown.map((f) => ({
      name: f.name,
      amount: f.amount,
      currency: f.currency,
      frequency: f.frequency,
    })),
    byPlace,
    byProductCategory,
    expenseCountInRange: inRange.length,
    sampleSize: sample.length,
  }

  return {
    snapshot,
    sample,
    scopedCategories,
    idByName,
    byPlace,
    expenses,
    ticketLines,
    products,
    productCategories,
    variableUyu: metrics.variableUyu,
    variableUsd: metrics.variableUsd,
    ...(selectedIds ? { scopedTotalUyu: scopedUyu, scopedTotalUsd: scopedUsd } : {}),
  }
}

// ─── Declaraciones de funciones para Gemini ───────────────

export const RECORTE_FUNCTION_DECLARATIONS = [
  {
    name: 'spend_by_category',
    description:
      'Gasto agregado por categoría en el período del recorte (exacto, coincide con Métricas): nombre, total UYU, total USD y cantidad de gastos.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'spend_by_place',
    description:
      'Gasto por LOCAL/lugar en el período: nombre del local, total UYU, total USD y cantidad de visitas. Usá esto para preguntas sobre locales; NO uses categorías como si fueran locales.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'spend_total',
    description:
      'TOTAL exacto gastado (UYU y USD) en el período. Si pasás nombres de categorías suma solo esas; si no, devuelve el gasto variable total. Usá SIEMPRE esta función para montos totales: es exacta.',
    parameters: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nombres de categorías a sumar (opcional).',
        },
      },
    },
  },
  {
    name: 'list_expenses',
    description:
      'Lista gastos individuales del período (para ejemplos o detalle), opcionalmente filtrados por categoría y/o local. No la uses para calcular totales.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filtrar por nombre de categoría (opcional).' },
        place: { type: 'string', description: 'Filtrar por nombre de local (opcional).' },
        limit: { type: 'number', description: 'Máximo de gastos a devolver (opcional, default 20).' },
      },
    },
  },
  {
    name: 'spend_by_product_category',
    description:
      'Gasto por CATEGORÍA DE PRODUCTO en el período (ej. Lácteos, Limpieza), calculado desde las líneas de ticket: nombre, total UYU y total USD. Exacto. Distinto de las categorías de gasto.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_product_categories',
    description: 'Lista las categorías de producto que el usuario tiene definidas (nombre e ícono).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_products',
    description:
      'Lista los productos del catálogo del usuario (nombre y su categoría de producto), opcionalmente filtrados por nombre.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Filtrar por nombre de producto (opcional).' },
        limit: { type: 'number', description: 'Máximo a devolver (opcional, default 30).' },
      },
    },
  },
  {
    name: 'list_ticket_lines',
    description:
      'Lista líneas de ticket (ítems individuales de las compras) del período, con producto, categoría de producto, local y monto. Filtrable por ítem/producto/categoría de producto. Para gasto en un producto o categoría de producto, preferí spend_by_product_category; usá esta para detalle/ejemplos.',
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string', description: 'Filtrar por texto del ítem (opcional).' },
        product: { type: 'string', description: 'Filtrar por nombre de producto (opcional).' },
        productCategory: { type: 'string', description: 'Filtrar por categoría de producto (opcional).' },
        limit: { type: 'number', description: 'Máximo a devolver (opcional, default 20).' },
      },
    },
  },
]

// ─── Ejecución de una función ─────────────────────────────

function spendTotal(bundle: RecorteBundle, categories?: string[]): Record<string, unknown> {
  if (!categories || categories.length === 0) {
    if (bundle.scopedTotalUyu !== undefined) {
      return { uyu: bundle.scopedTotalUyu, usd: bundle.scopedTotalUsd ?? 0 }
    }
    return { uyu: bundle.variableUyu, usd: bundle.variableUsd }
  }
  const ids = new Set<string>()
  for (const n of categories) {
    const id = bundle.idByName.get(String(n).trim().toLowerCase())
    if (id) ids.add(id)
  }
  if (ids.size === 0) {
    return { uyu: 0, usd: 0, note: 'ninguna categoría coincidió con las existentes' }
  }
  let uyu = 0
  let usd = 0
  for (const c of bundle.scopedCategories) {
    if (!ids.has(c.categoryId)) continue
    if (c.parentId && ids.has(c.parentId)) continue // dedup padre/hija
    uyu += c.uyu
    usd += c.usd
  }
  return { uyu, usd, matched: [...ids].length }
}

function listExpenses(
  bundle: RecorteBundle,
  args: { category?: string; place?: string; limit?: number },
): Record<string, unknown> {
  const catL = args.category?.trim().toLowerCase()
  const plL = args.place?.trim().toLowerCase()
  let out = bundle.expenses
  if (catL) out = out.filter((e) => e.categories.some((c) => c.toLowerCase().includes(catL)))
  if (plL) out = out.filter((e) => (e.place ?? '').toLowerCase().includes(plL))
  const limit = Math.min(typeof args.limit === 'number' ? args.limit : 20, MAX_LIST_EXPENSES)
  return { expenses: out.slice(0, limit), total: out.length, truncated: out.length > limit }
}

function listProducts(
  bundle: RecorteBundle,
  args: { query?: string; limit?: number },
): Record<string, unknown> {
  const qL = args.query?.trim().toLowerCase()
  let out = bundle.products
  if (qL) out = out.filter((p) => p.name.toLowerCase().includes(qL))
  const limit = Math.min(typeof args.limit === 'number' ? args.limit : 30, MAX_LIST_EXPENSES)
  return { products: out.slice(0, limit), total: out.length, truncated: out.length > limit }
}

function listTicketLines(
  bundle: RecorteBundle,
  args: { item?: string; product?: string; productCategory?: string; limit?: number },
): Record<string, unknown> {
  const itemL = args.item?.trim().toLowerCase()
  const prodL = args.product?.trim().toLowerCase()
  const pcatL = args.productCategory?.trim().toLowerCase()
  let out = bundle.ticketLines
  if (itemL) out = out.filter((l) => l.item.toLowerCase().includes(itemL))
  if (prodL) out = out.filter((l) => (l.product ?? '').toLowerCase().includes(prodL))
  if (pcatL) out = out.filter((l) => (l.productCategory ?? '').toLowerCase().includes(pcatL))
  const limit = Math.min(typeof args.limit === 'number' ? args.limit : 20, MAX_LIST_EXPENSES)
  return { lines: out.slice(0, limit), total: out.length, truncated: out.length > limit }
}

/** Ejecuta una función pedida por el modelo. Devuelve SIEMPRE un objeto (requisito de la API). */
export function executeRecorteTool(
  name: string,
  args: Record<string, unknown>,
  bundle: RecorteBundle,
): Record<string, unknown> {
  switch (name) {
    case 'spend_by_category':
      return { categories: bundle.snapshot.byCategory }
    case 'spend_by_place':
      return { places: bundle.byPlace }
    case 'spend_total':
      return spendTotal(bundle, Array.isArray(args['categories']) ? (args['categories'] as string[]) : undefined)
    case 'list_expenses':
      return listExpenses(bundle, {
        category: typeof args['category'] === 'string' ? (args['category'] as string) : undefined,
        place: typeof args['place'] === 'string' ? (args['place'] as string) : undefined,
        limit: typeof args['limit'] === 'number' ? (args['limit'] as number) : undefined,
      })
    case 'spend_by_product_category':
      return { productCategories: bundle.snapshot.byProductCategory }
    case 'list_product_categories':
      return { categories: bundle.productCategories }
    case 'list_products':
      return listProducts(bundle, {
        query: typeof args['query'] === 'string' ? (args['query'] as string) : undefined,
        limit: typeof args['limit'] === 'number' ? (args['limit'] as number) : undefined,
      })
    case 'list_ticket_lines':
      return listTicketLines(bundle, {
        item: typeof args['item'] === 'string' ? (args['item'] as string) : undefined,
        product: typeof args['product'] === 'string' ? (args['product'] as string) : undefined,
        productCategory:
          typeof args['productCategory'] === 'string' ? (args['productCategory'] as string) : undefined,
        limit: typeof args['limit'] === 'number' ? (args['limit'] as number) : undefined,
      })
    default:
      return { error: `función desconocida: ${name}` }
  }
}
