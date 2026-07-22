// src/features/dashboard/periods.ts
// Etiquetas y opciones de período para los widgets (fase 1: solo presets).

import { PeriodFilter } from '@/types/enums'

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  [PeriodFilter.SevenDays]: 'Últimos 7 días',
  [PeriodFilter.Month]: 'Este mes',
  [PeriodFilter.LastMonth]: 'Mes pasado',
  [PeriodFilter.ThreeMonths]: 'Últimos 3 meses',
  [PeriodFilter.SixMonths]: 'Últimos 6 meses',
  [PeriodFilter.Year]: 'Este año',
  [PeriodFilter.All]: 'Todo el historial',
}

export const PERIOD_OPTIONS = Object.values(PeriodFilter).map((value) => ({
  value,
  label: PERIOD_LABELS[value],
}))

function isoDate(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Rango [start, end] (YYYY-MM-DD) de un período, relativo a `now`. Mismos límites
// que usan los backends de gastos, para scopear datos client-side (ej. recurrentes).
export function periodRange(period: PeriodFilter, now: Date): { start: string; end: string } {
  const end = isoDate(now)
  const d = new Date(now)
  switch (period) {
    case PeriodFilter.SevenDays:
      d.setDate(d.getDate() - 7)
      return { start: isoDate(d), end }
    case PeriodFilter.Month:
      return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end }
    case PeriodFilter.LastMonth: {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: isoDate(first), end: isoDate(last) }
    }
    case PeriodFilter.ThreeMonths:
      d.setMonth(d.getMonth() - 3)
      return { start: isoDate(d), end }
    case PeriodFilter.SixMonths:
      d.setMonth(d.getMonth() - 6)
      return { start: isoDate(d), end }
    case PeriodFilter.Year:
      return { start: `${now.getFullYear()}-01-01`, end }
    case PeriodFilter.All:
    default:
      return { start: '1970-01-01', end }
  }
}
