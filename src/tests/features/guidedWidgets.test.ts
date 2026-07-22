// src/tests/features/guidedWidgets.test.ts
import { describe, it, expect } from 'vitest'
import { computeGuidedBlock } from '@/features/dashboard/widgetValue'
import {
  Currency,
  GuidedSource,
  GuidedPrimaryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
} from '@/types/enums'
import type { MetricsSummary, GuidedBlock, BudgetSettings } from '@/types/models'

const metrics: MetricsSummary = {
  period: 'month',
  totalUsd: 100,
  totalUyu: 4000,
  previousPeriodUsd: 80,
  previousPeriodUyu: 5000,
  variableUsd: 60,
  variableUyu: 2500,
  fixedUsd: 40,
  fixedUyu: 1500,
  monthlyHistory: [
    { month: 5, year: 2026, label: 'May', usd: 90, uyu: 3000, fixedUsd: 40, fixedUyu: 1500, variableUsd: 50, variableUyu: 1500 },
    { month: 6, year: 2026, label: 'Jun', usd: 100, uyu: 4000, fixedUsd: 40, fixedUyu: 1500, variableUsd: 60, variableUyu: 2500 },
  ],
  byCategory: [
    { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 0, uyu: 1200, expenseCount: 5, expenseCountUsd: 0, expenseCountUyu: 5 },
  ],
  previousByCategory: [
    { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 0, uyu: 1000, expenseCount: 4, expenseCountUsd: 0, expenseCountUyu: 4 },
  ],
  fixedBreakdown: [],
  byProductCategory: [],
}

const budget: BudgetSettings = { usd: 500, uyu: 20000 }

function block(partial: Partial<GuidedBlock> & Pick<GuidedBlock, 'metric'>): GuidedBlock {
  return {
    id: 'b1',
    primaryDisplay: GuidedPrimaryDisplay.Number,
    comparisons: [],
    ...partial,
  }
}

describe('computeGuidedBlock', () => {
  it('total gastado toma el total de la moneda pedida', () => {
    const r = computeGuidedBlock(block({ metric: { source: GuidedSource.TotalSpent, currency: Currency.USD } }), {
      metrics,
      budget,
      recurring: [],
    })
    expect(r.amount).toBe(100)
    expect(r.currency).toBe(Currency.USD)
  })

  it('gasto por categoría resuelve por categoryId y moneda', () => {
    const r = computeGuidedBlock(
      block({ metric: { source: GuidedSource.CategorySpent, currency: Currency.UYU, categoryId: 'cat-1' } }),
      { metrics, budget, recurring: [] },
    )
    expect(r.amount).toBe(1200)
  })

  it('presupuesto restante = presupuesto - gastado', () => {
    const r = computeGuidedBlock(block({ metric: { source: GuidedSource.BudgetRemaining, currency: Currency.USD } }), {
      metrics,
      budget,
      recurring: [],
    })
    expect(r.amount).toBe(400) // 500 - 100
  })

  it('presupuesto restante es null sin presupuesto', () => {
    const r = computeGuidedBlock(block({ metric: { source: GuidedSource.BudgetRemaining, currency: Currency.USD } }), {
      metrics,
      budget: undefined,
      recurring: [],
    })
    expect(r.amount).toBeNull()
  })

  it('comparación vs período anterior calcula el delta con signo', () => {
    const r = computeGuidedBlock(
      block({
        metric: { source: GuidedSource.TotalSpent, currency: Currency.USD },
        comparisons: [{ type: WidgetComparisonType.PreviousPeriod, render: WidgetComparisonRender.Delta }],
      }),
      { metrics, budget, recurring: [] },
    )
    expect(r.comparisons).toHaveLength(1)
    expect(r.comparisons[0]?.deltaPct).toBe(25) // (100-80)/80
  })

  it('comparación de presupuesto produce un ratio de progreso', () => {
    const r = computeGuidedBlock(
      block({
        metric: { source: GuidedSource.TotalSpent, currency: Currency.UYU },
        comparisons: [{ type: WidgetComparisonType.Budget, render: WidgetComparisonRender.Progress }],
      }),
      { metrics, budget, recurring: [] },
    )
    expect(r.comparisons[0]?.ratioPct).toBe(20) // 4000/20000
  })

  it('descarta comparaciones sin datos (previo = 0)', () => {
    const r = computeGuidedBlock(
      block({
        metric: { source: GuidedSource.FixedTotal, currency: Currency.USD },
        comparisons: [{ type: WidgetComparisonType.PreviousPeriod, render: WidgetComparisonRender.Delta }],
      }),
      { metrics, budget, recurring: [] },
    )
    // FixedTotal no tiene "período anterior" en el summary → se descarta.
    expect(r.comparisons).toHaveLength(0)
  })

  it('sparkline arma la serie de la moneda para variables', () => {
    const r = computeGuidedBlock(
      block({
        metric: { source: GuidedSource.VariableTotal, currency: Currency.UYU },
        primaryDisplay: GuidedPrimaryDisplay.Sparkline,
      }),
      { metrics, budget, recurring: [] },
    )
    expect(r.sparkline).toEqual([1500, 2500])
  })
})
