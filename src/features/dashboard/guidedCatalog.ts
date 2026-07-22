// src/features/dashboard/guidedCatalog.ts
//
// Metadata del catálogo cerrado de "sources" del motor guiado. Lo usan tanto el
// editor (para ofrecer solo opciones válidas) como el cálculo (para saber qué
// datos hay disponibles). Todo se deriva de MetricsSummary (+ budget/recurring).

import { GuidedSource, WidgetComparisonType } from '@/types/enums'

export interface GuidedSourceMeta {
  label: string
  icon: string
  needsCurrency: boolean
  needsCategory: boolean
  needsRecurring: boolean
  /** monthlyHistory tiene serie para este source. */
  allowsSparkline: boolean
  /** Comparaciones computables para este source. */
  comparisons: WidgetComparisonType[]
}

export const GUIDED_SOURCES: Record<GuidedSource, GuidedSourceMeta> = {
  [GuidedSource.TotalSpent]: {
    label: 'Total gastado',
    icon: '💰',
    needsCurrency: true,
    needsCategory: false,
    needsRecurring: false,
    allowsSparkline: true,
    comparisons: [
      WidgetComparisonType.PreviousPeriod,
      WidgetComparisonType.Budget,
      WidgetComparisonType.Target,
    ],
  },
  [GuidedSource.CategorySpent]: {
    label: 'Gasto por categoría',
    icon: '🏷️',
    needsCurrency: true,
    needsCategory: true,
    needsRecurring: false,
    allowsSparkline: false,
    comparisons: [WidgetComparisonType.PreviousPeriod, WidgetComparisonType.Target],
  },
  [GuidedSource.BudgetRemaining]: {
    label: 'Presupuesto restante',
    icon: '🎯',
    needsCurrency: true,
    needsCategory: false,
    needsRecurring: false,
    allowsSparkline: false,
    comparisons: [WidgetComparisonType.Target],
  },
  [GuidedSource.RecurringTotal]: {
    label: 'Total de un recurrente',
    icon: '🔁',
    needsCurrency: false,
    needsCategory: false,
    needsRecurring: true,
    allowsSparkline: false,
    comparisons: [WidgetComparisonType.Target],
  },
  [GuidedSource.FixedTotal]: {
    label: 'Gastos fijos',
    icon: '📌',
    needsCurrency: true,
    needsCategory: false,
    needsRecurring: false,
    allowsSparkline: true,
    comparisons: [WidgetComparisonType.Target],
  },
  [GuidedSource.VariableTotal]: {
    label: 'Gastos variables',
    icon: '📊',
    needsCurrency: true,
    needsCategory: false,
    needsRecurring: false,
    allowsSparkline: true,
    comparisons: [WidgetComparisonType.PreviousPeriod, WidgetComparisonType.Target],
  },
}

export const COMPARISON_LABELS: Record<WidgetComparisonType, string> = {
  [WidgetComparisonType.PreviousPeriod]: 'vs período anterior',
  [WidgetComparisonType.Budget]: 'vs presupuesto',
  [WidgetComparisonType.Target]: 'vs meta',
}
