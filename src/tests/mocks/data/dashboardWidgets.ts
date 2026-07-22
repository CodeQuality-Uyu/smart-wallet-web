// src/tests/mocks/data/dashboardWidgets.ts
import type { DashboardWidget } from '@/types/models'
import {
  Currency,
  PeriodFilter,
  WidgetEngine,
  WidgetSize,
  GuidedSource,
  GuidedPrimaryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
  QueryGroupBy,
  QueryAggregate,
  QueryDisplay,
} from '@/types/enums'

export const mockDashboardWidgets: DashboardWidget[] = [
  // Reproduce una card tipo "total del mes en USD": valor + delta vs mes pasado + barra de presupuesto.
  {
    id: 'widget-1',
    title: 'Gastos del mes (USD)',
    icon: '💰',
    color: '#16a34a',
    size: WidgetSize.Md,
    engine: WidgetEngine.Guided,
    guided: {
      period: PeriodFilter.Month,
      blocks: [
        {
          id: 'block-1',
          metric: { source: GuidedSource.TotalSpent, currency: Currency.USD },
          primaryDisplay: GuidedPrimaryDisplay.Number,
          comparisons: [
            { type: WidgetComparisonType.PreviousPeriod, render: WidgetComparisonRender.Delta },
            { type: WidgetComparisonType.Budget, render: WidgetComparisonRender.Progress },
          ],
        },
      ],
    },
    position: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  // Un widget con un bloque de categoría + su comparación mensual.
  {
    id: 'widget-2',
    title: 'Comida',
    icon: '🍔',
    color: '#ef4444',
    size: WidgetSize.Sm,
    engine: WidgetEngine.Guided,
    guided: {
      period: PeriodFilter.Month,
      blocks: [
        {
          id: 'block-2',
          icon: '🍔',
          metric: { source: GuidedSource.CategorySpent, currency: Currency.UYU, categoryId: 'cat-1' },
          primaryDisplay: GuidedPrimaryDisplay.Number,
          comparisons: [
            { type: WidgetComparisonType.PreviousPeriod, render: WidgetComparisonRender.Delta },
          ],
        },
      ],
    },
    position: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  // Motor QUERY: gasto en UYU agrupado por categoría, como gráfica de barras.
  {
    id: 'widget-3',
    title: 'Gasto por categoría',
    icon: '📊',
    color: '#3b82f6',
    size: WidgetSize.Md,
    engine: WidgetEngine.Query,
    query: {
      source: 'expenses',
      currency: Currency.UYU,
      period: PeriodFilter.Month,
      filters: {},
      groupBy: QueryGroupBy.Category,
      aggregate: QueryAggregate.Sum,
      display: QueryDisplay.Bar,
    },
    position: 2,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]
