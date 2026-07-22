// src/components/ui/PeriodControl.constants.ts

import { PeriodFilter } from '@/types/enums'

export interface PeriodOption<T extends string = PeriodFilter> {
  value: T
  label: string
}

export const PERIODS: PeriodOption[] = [
  { value: PeriodFilter.SevenDays, label: '7d' },
  { value: PeriodFilter.Month, label: 'Mes' },
  { value: PeriodFilter.ThreeMonths, label: '3m' },
  { value: PeriodFilter.Year, label: 'Año' },
]

// Metrics also supports a "last full month" view. Kept separate from PERIODS
// because other screens (expenses, reports…) don't resolve `lastMonth` bounds.
export const METRICS_PERIODS: PeriodOption[] = [
  { value: PeriodFilter.SevenDays, label: '7d' },
  { value: PeriodFilter.LastMonth, label: 'Mes pasado' },
  { value: PeriodFilter.Month, label: 'Mes' },
  { value: PeriodFilter.ThreeMonths, label: '3m' },
  { value: PeriodFilter.Year, label: 'Año' },
]

// Time filter for the savings-suggestions card (self-contained usages, e.g. Resumen).
export const SUGGESTION_PERIODS: PeriodOption[] = [
  { value: PeriodFilter.Month, label: 'Mes' },
  { value: PeriodFilter.LastMonth, label: 'Mes pasado' },
  { value: PeriodFilter.ThreeMonths, label: '3m' },
  { value: PeriodFilter.Year, label: 'Año' },
  { value: PeriodFilter.All, label: 'Todo' },
]
