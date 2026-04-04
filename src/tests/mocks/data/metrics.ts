// src/tests/mocks/data/metrics.ts
import type { MetricsSummary } from '@/types/models'
import { Currency, RecurringFrequency, RecurringMode } from '@/types/enums'

export const mockMetrics: MetricsSummary = {
  period: 'month',
  totalUsd: 560,
  totalUyu: 24800,
  previousPeriodUsd: 496,
  previousPeriodUyu: 26400,
  variableUsd: 547.02,
  variableUyu: 17620,
  fixedUsd: 12.98,
  fixedUyu: 7180,
  monthlyHistory: [
    { month: 10, year: 2025, label: 'Oct', usd: 480,  uyu: 18000, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 467.02, variableUyu: 14710 },
    { month: 11, year: 2025, label: 'Nov', usd: 520,  uyu: 21000, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 507.02, variableUyu: 17710 },
    { month: 12, year: 2025, label: 'Dic', usd: 710,  uyu: 28000, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 697.02, variableUyu: 24710 },
    { month: 1,  year: 2026, label: 'Ene', usd: 390,  uyu: 19000, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 377.02, variableUyu: 15710 },
    { month: 2,  year: 2026, label: 'Feb', usd: 430,  uyu: 22000, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 417.02, variableUyu: 18710 },
    { month: 3,  year: 2026, label: 'Mar', usd: 560,  uyu: 24800, fixedUsd: 12.98, fixedUyu: 3290, variableUsd: 547.02, variableUyu: 21510 },
  ],
  byCategory: [
    { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 186, uyu: 3200, expenseCount: 8 },
    { categoryId: 'cat-5', categoryName: 'Hogar', categoryIcon: '🏠', usd: 0, uyu: 5180, expenseCount: 3 },
    { categoryId: 'cat-3', categoryName: 'Transporte', categoryIcon: '🚌', usd: 0, uyu: 2100, expenseCount: 5 },
    { categoryId: 'cat-6', categoryName: 'Ocio', categoryIcon: '🎬', usd: 12.98, uyu: 0, expenseCount: 2 },
    { categoryId: 'cat-4', categoryName: 'Salud', categoryIcon: '💊', usd: 0, uyu: 230, expenseCount: 1 },
  ],
  previousByCategory: [
    { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 160, uyu: 2700, expenseCount: 7 },
    { categoryId: 'cat-5', categoryName: 'Hogar', categoryIcon: '🏠', usd: 0, uyu: 4200, expenseCount: 3 },
    { categoryId: 'cat-3', categoryName: 'Transporte', categoryIcon: '🚌', usd: 0, uyu: 2600, expenseCount: 4 },
    { categoryId: 'cat-6', categoryName: 'Ocio', categoryIcon: '🎬', usd: 12.98, uyu: 0, expenseCount: 2 },
    { categoryId: 'cat-4', categoryName: 'Salud', categoryIcon: '💊', usd: 0, uyu: 310, expenseCount: 1 },
  ],
  byProductCategory: [
    { productCategoryId: 'pcat-1', productCategoryName: 'Lácteos',  productCategoryIcon: '🥛', usd: 0,  uyu: 1840 },
    { productCategoryId: 'pcat-2', productCategoryName: 'Verduras', productCategoryIcon: '🥦', usd: 0,  uyu: 960  },
    { productCategoryId: 'pcat-3', productCategoryName: 'Snacks',   productCategoryIcon: '🍿', usd: 42, uyu: 580  },
  ],
  fixedBreakdown: [
    { recurringId: 'rec-3', name: 'UTE — Luz', icon: '💡', mode: RecurringMode.Manual, amount: 2400, currency: Currency.UYU, frequency: RecurringFrequency.Monthly },
    { recurringId: 'rec-4', name: 'OSE — Agua', icon: '💧', mode: RecurringMode.Manual, amount: 890, currency: Currency.UYU, frequency: RecurringFrequency.Monthly },
    { recurringId: 'rec-1', name: 'Netflix', icon: '🎬', mode: RecurringMode.Auto, amount: 6.99, currency: Currency.USD, frequency: RecurringFrequency.Monthly },
    { recurringId: 'rec-2', name: 'Spotify', icon: '🎵', mode: RecurringMode.Auto, amount: 5.99, currency: Currency.USD, frequency: RecurringFrequency.Annual },
  ],
}
