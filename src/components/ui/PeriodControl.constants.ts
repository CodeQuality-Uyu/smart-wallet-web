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
