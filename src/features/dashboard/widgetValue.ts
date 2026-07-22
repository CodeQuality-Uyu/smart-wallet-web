// src/features/dashboard/widgetValue.ts
//
// Motor de cálculo del engine GUIADO. Funciones puras que, a partir de un bloque
// y del MetricsSummary del período del widget (+ budget/recurring), producen el
// valor a mostrar y sus comparaciones. Nada se persiste: el número se deriva en
// cada render. Las monedas nunca se mezclan.

import {
  Currency,
  GuidedSource,
  GuidedPrimaryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
} from '@/types/enums'
import { formatCurrency } from '@/utils/formatCurrency'
import { GUIDED_SOURCES } from './guidedCatalog'
import type {
  MetricsSummary,
  BudgetSettings,
  RecurringExpense,
  GuidedBlock,
  WidgetComparison,
} from '@/types/models'

export interface WidgetComputeContext {
  metrics: MetricsSummary
  budget: BudgetSettings | undefined
  recurring: RecurringExpense[]
}

export interface ComputedComparison {
  render: WidgetComparisonRender
  /** Nombre del tipo de comparación, ej. "Presupuesto" / "Meta" / "Período anterior". */
  label: string
  /** Delta con signo (%). Presente en render = Delta. */
  deltaPct?: number
  /** Progreso 0..100+ (%). Presente en render = Progress. */
  ratioPct?: number
  /** Texto descriptivo, ej. "vs mes pasado" o "de U$S 500". */
  caption: string
}

export interface ComputedBlock {
  currency: Currency
  /** null = configuración incompleta o métrica sin datos. */
  amount: number | null
  /** Serie para el sparkline (por moneda), si aplica. */
  sparkline?: number[]
  comparisons: ComputedComparison[]
}

function pick(currency: Currency, usd: number, uyu: number): number {
  return currency === Currency.USD ? usd : uyu
}

function budgetFor(currency: Currency, budget: BudgetSettings | undefined): number | undefined {
  return currency === Currency.USD ? budget?.usd : budget?.uyu
}

/** Valor "anterior" del source, si el summary lo tiene. */
function previousValue(block: GuidedBlock, currency: Currency, m: MetricsSummary): number | null {
  switch (block.metric.source) {
    case GuidedSource.TotalSpent:
      return pick(currency, m.previousPeriodUsd, m.previousPeriodUyu)
    case GuidedSource.CategorySpent: {
      const prev = m.previousByCategory.find((c) => c.categoryId === block.metric.categoryId)
      return prev ? pick(currency, prev.usd, prev.uyu) : 0
    }
    default:
      return null
  }
}

function sparklineSeries(source: GuidedSource, currency: Currency, m: MetricsSummary): number[] | undefined {
  const usd = currency === Currency.USD
  switch (source) {
    case GuidedSource.TotalSpent:
      return m.monthlyHistory.map((h) => (usd ? h.usd : h.uyu))
    case GuidedSource.FixedTotal:
      return m.monthlyHistory.map((h) => (usd ? h.fixedUsd : h.fixedUyu))
    case GuidedSource.VariableTotal:
      return m.monthlyHistory.map((h) => (usd ? h.variableUsd : h.variableUyu))
    default:
      return undefined
  }
}

function computeComparison(
  spec: WidgetComparison,
  block: GuidedBlock,
  amount: number,
  currency: Currency,
  ctx: WidgetComputeContext,
): ComputedComparison | null {
  const { metrics, budget } = ctx

  if (spec.type === WidgetComparisonType.PreviousPeriod) {
    const prev = previousValue(block, currency, metrics)
    if (prev == null || prev <= 0) return null
    const deltaPct = Math.round(((amount - prev) / prev) * 100)
    return { render: WidgetComparisonRender.Delta, label: 'Período anterior', deltaPct, caption: '' }
  }

  if (spec.type === WidgetComparisonType.Budget) {
    const bgt = budgetFor(currency, budget)
    if (bgt == null || bgt <= 0) return null
    const ratioPct = Math.round((amount / bgt) * 100)
    return {
      render: WidgetComparisonRender.Progress,
      label: 'Presupuesto',
      ratioPct,
      caption: `de ${formatCurrency(bgt, currency)}`,
    }
  }

  // Target
  const target = spec.targetValue
  if (target == null || target <= 0) return null
  if (spec.render === WidgetComparisonRender.Progress) {
    return {
      render: WidgetComparisonRender.Progress,
      label: 'Meta',
      ratioPct: Math.round((amount / target) * 100),
      caption: `de ${formatCurrency(target, currency)}`,
    }
  }
  return {
    render: WidgetComparisonRender.Delta,
    label: 'Meta',
    deltaPct: Math.round(((amount - target) / target) * 100),
    caption: formatCurrency(target, currency),
  }
}

export function computeGuidedBlock(block: GuidedBlock, ctx: WidgetComputeContext): ComputedBlock {
  const { metrics, budget, recurring } = ctx
  const { source } = block.metric

  // Resolver moneda (para recurrentes sale del propio recurrente).
  let currency = block.metric.currency ?? Currency.UYU
  let amount: number | null

  switch (source) {
    case GuidedSource.TotalSpent:
      amount = pick(currency, metrics.totalUsd, metrics.totalUyu)
      break
    case GuidedSource.CategorySpent: {
      if (!block.metric.categoryId) {
        amount = null
        break
      }
      const cat = metrics.byCategory.find((c) => c.categoryId === block.metric.categoryId)
      amount = cat ? pick(currency, cat.usd, cat.uyu) : 0
      break
    }
    case GuidedSource.BudgetRemaining: {
      const bgt = budgetFor(currency, budget)
      amount = bgt == null ? null : bgt - pick(currency, metrics.totalUsd, metrics.totalUyu)
      break
    }
    case GuidedSource.RecurringTotal: {
      const r = recurring.find((x) => x.id === block.metric.recurringId)
      if (!r) {
        amount = null
        break
      }
      currency = r.currency
      amount = r.amount
      break
    }
    case GuidedSource.FixedTotal:
      amount = pick(currency, metrics.fixedUsd, metrics.fixedUyu)
      break
    case GuidedSource.VariableTotal:
      amount = pick(currency, metrics.variableUsd, metrics.variableUyu)
      break
    default:
      amount = null
  }

  const comparisons: ComputedComparison[] = []
  if (amount != null) {
    for (const spec of block.comparisons) {
      const c = computeComparison(spec, block, amount, currency, ctx)
      if (c) comparisons.push(c)
    }
  }

  const sparkline =
    block.primaryDisplay === GuidedPrimaryDisplay.Sparkline
      ? sparklineSeries(source, currency, metrics)
      : undefined

  return { currency, amount, sparkline, comparisons }
}

export function guidedSourceIcon(source: GuidedSource): string {
  return GUIDED_SOURCES[source].icon
}
