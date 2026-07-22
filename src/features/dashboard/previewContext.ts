// src/features/dashboard/previewContext.ts
//
// Construye un WidgetComputeContext con datos DUMMY para el previsualizador del
// editor. Los totales son fijos y realistas; las entradas por categoría se
// inyectan para cada categoryId referenciado en los bloques, de modo que un
// bloque de categoría muestre un número (y no "–") mientras se edita.

import { GuidedSource } from '@/types/enums'
import type { MetricsSummary, CategorySpend, GuidedBlock, RecurringExpense, BudgetSettings } from '@/types/models'
import type { WidgetComputeContext } from './widgetValue'

const PREVIEW_BUDGET: BudgetSettings = { usd: 500, uyu: 25000 }

const PREVIEW_HISTORY: MetricsSummary['monthlyHistory'] = [
  { month: 2, year: 2026, label: 'Feb', usd: 260, uyu: 15200, fixedUsd: 120, fixedUyu: 7000, variableUsd: 140, variableUyu: 8200 },
  { month: 3, year: 2026, label: 'Mar', usd: 300, uyu: 17800, fixedUsd: 130, fixedUyu: 7100, variableUsd: 170, variableUyu: 10700 },
  { month: 4, year: 2026, label: 'Abr', usd: 285, uyu: 21000, fixedUsd: 130, fixedUyu: 7200, variableUsd: 155, variableUyu: 13800 },
  { month: 5, year: 2026, label: 'May', usd: 340, uyu: 16400, fixedUsd: 130, fixedUyu: 7250, variableUsd: 210, variableUyu: 9150 },
  { month: 6, year: 2026, label: 'Jun', usd: 280, uyu: 20100, fixedUsd: 130, fixedUyu: 7250, variableUsd: 150, variableUyu: 12850 },
  { month: 7, year: 2026, label: 'Jul', usd: 320, uyu: 18450, fixedUsd: 130, fixedUyu: 7250, variableUsd: 190, variableUyu: 11200 },
]

// Hash estable → monto dummy determinístico por categoría (no parpadea al editar).
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function dummyCategory(categoryId: string): CategorySpend {
  const h = hash(categoryId)
  return {
    categoryId,
    categoryName: 'Categoría',
    categoryIcon: '🏷️',
    usd: 40 + (h % 120),
    uyu: 1200 + (h % 6000),
    expenseCount: 3 + (h % 12),
    expenseCountUsd: 1 + (h % 4),
    expenseCountUyu: 2 + (h % 9),
  }
}

export function buildPreviewContext(
  blocks: GuidedBlock[],
  recurring: RecurringExpense[],
): WidgetComputeContext {
  const catIds = new Set(
    blocks
      .filter((b) => b.metric.source === GuidedSource.CategorySpent && b.metric.categoryId)
      .map((b) => b.metric.categoryId as string),
  )
  const byCategory = [...catIds].map(dummyCategory)
  // Período anterior: mismo id con ~85% del monto, para que el delta tenga sentido.
  const previousByCategory = byCategory.map((c) => ({
    ...c,
    usd: Math.round(c.usd * 0.85),
    uyu: Math.round(c.uyu * 0.85),
  }))

  const metrics: MetricsSummary = {
    period: 'preview',
    totalUsd: 320,
    totalUyu: 18450,
    previousPeriodUsd: 280,
    previousPeriodUyu: 20100,
    variableUsd: 190,
    variableUyu: 11200,
    fixedUsd: 130,
    fixedUyu: 7250,
    monthlyHistory: PREVIEW_HISTORY,
    byCategory,
    previousByCategory,
    fixedBreakdown: [],
    byProductCategory: [],
  }

  return { metrics, budget: PREVIEW_BUDGET, recurring }
}
