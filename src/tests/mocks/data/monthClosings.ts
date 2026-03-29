// src/tests/mocks/data/monthClosings.ts
import type { MonthClosing } from '@/types/models'
import { Currency, RecurringMode, RecurringFrequency } from '@/types/enums'

export const mockMonthClosings: MonthClosing[] = [
  {
    id: '2026-01',
    year: 2026,
    month: 1,
    closedAt: '2026-01-31T22:00:00Z',
    totalUsd: 390,
    totalUyu: 19000,
    variableUsd: 377.02,
    variableUyu: 11820,
    fixedUsd: 12.98,
    fixedUyu: 7180,
    recurringPaid: [
      { recurringId: 'rec-1', name: 'Netflix', icon: '🎬', amount: 6.99, currency: Currency.USD, mode: RecurringMode.Auto, frequency: RecurringFrequency.Monthly },
      { recurringId: 'rec-2', name: 'Spotify', icon: '🎵', amount: 5.99, currency: Currency.USD, mode: RecurringMode.Auto, frequency: RecurringFrequency.Annual },
      { recurringId: 'rec-3', name: 'UTE — Luz', icon: '💡', amount: 2400, currency: Currency.UYU, mode: RecurringMode.Manual, frequency: RecurringFrequency.Monthly },
      { recurringId: 'rec-4', name: 'OSE — Agua', icon: '💧', amount: 890, currency: Currency.UYU, mode: RecurringMode.Manual, frequency: RecurringFrequency.Monthly },
    ],
    topCategories: [
      { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 160, uyu: 2700 },
      { categoryId: 'cat-5', categoryName: 'Hogar', categoryIcon: '🏠', usd: 0, uyu: 4200 },
      { categoryId: 'cat-3', categoryName: 'Transporte', categoryIcon: '🚌', usd: 0, uyu: 2600 },
    ],
  },
  {
    id: '2026-02',
    year: 2026,
    month: 2,
    closedAt: '2026-02-28T21:30:00Z',
    totalUsd: 430,
    totalUyu: 22000,
    variableUsd: 417.02,
    variableUyu: 14820,
    fixedUsd: 12.98,
    fixedUyu: 7180,
    recurringPaid: [
      { recurringId: 'rec-1', name: 'Netflix', icon: '🎬', amount: 6.99, currency: Currency.USD, mode: RecurringMode.Auto, frequency: RecurringFrequency.Monthly },
      { recurringId: 'rec-2', name: 'Spotify', icon: '🎵', amount: 5.99, currency: Currency.USD, mode: RecurringMode.Auto, frequency: RecurringFrequency.Annual },
      { recurringId: 'rec-3', name: 'UTE — Luz', icon: '💡', amount: 2400, currency: Currency.UYU, mode: RecurringMode.Manual, frequency: RecurringFrequency.Monthly },
      { recurringId: 'rec-4', name: 'OSE — Agua', icon: '💧', amount: 890, currency: Currency.UYU, mode: RecurringMode.Manual, frequency: RecurringFrequency.Monthly },
    ],
    topCategories: [
      { categoryId: 'cat-1', categoryName: 'Comida', categoryIcon: '🍔', usd: 170, uyu: 2900 },
      { categoryId: 'cat-5', categoryName: 'Hogar', categoryIcon: '🏠', usd: 0, uyu: 4500 },
      { categoryId: 'cat-4', categoryName: 'Salud', categoryIcon: '💊', usd: 0, uyu: 310 },
    ],
  },
]
