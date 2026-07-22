// src/features/recortes/recorteConstants.ts
// Metadatos y plantillas para el feature de recortes.

import { PeriodFilter, RecorteOutputFormat } from '@/types/enums'
import type { PeriodOption } from '@/components/ui/PeriodControl.constants'
import type { Recorte } from '@/types/models'

// Presets de rango disponibles al crear/editar un recorte.
export const RECORTE_PERIODS: PeriodOption[] = [
  { value: PeriodFilter.Month, label: 'Mes' },
  { value: PeriodFilter.LastMonth, label: 'Mes pasado' },
  { value: PeriodFilter.ThreeMonths, label: '3 meses' },
  { value: PeriodFilter.SixMonths, label: '6 meses' },
  { value: PeriodFilter.Year, label: 'Año' },
  { value: PeriodFilter.All, label: 'Todo' },
]

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  [PeriodFilter.SevenDays]: 'Últimos 7 días',
  [PeriodFilter.Month]: 'Este mes',
  [PeriodFilter.LastMonth]: 'Mes pasado',
  [PeriodFilter.ThreeMonths]: 'Últimos 3 meses',
  [PeriodFilter.SixMonths]: 'Últimos 6 meses',
  [PeriodFilter.Year]: 'Último año',
  [PeriodFilter.All]: 'Todo el historial',
}

/** Etiqueta legible del rango efectivo de un recorte. */
export function periodLabel(recorte: Pick<Recorte, 'period' | 'sinceDate'>): string {
  if (recorte.sinceDate) return `Desde ${recorte.sinceDate}`
  return PERIOD_LABELS[recorte.period] ?? PERIOD_LABELS[PeriodFilter.Month]
}

export interface OutputFormatMeta {
  value: RecorteOutputFormat
  label: string
  hint: string
  icon: string
}

export const OUTPUT_FORMATS: OutputFormatMeta[] = [
  { value: RecorteOutputFormat.Amount, label: 'Monto', hint: 'Un número destacado (ej. ahorro potencial)', icon: '💰' },
  { value: RecorteOutputFormat.Text, label: 'Análisis', hint: 'Un párrafo en lenguaje natural', icon: '📝' },
  { value: RecorteOutputFormat.List, label: 'Lista', hint: 'Varios hallazgos como ítems', icon: '📋' },
  { value: RecorteOutputFormat.Badge, label: 'Semáforo', hint: 'Estado: bien / atención / alerta', icon: '🚦' },
]

// Plantillas sugeridas al crear un recorte. Se muestran debajo del textarea y
// filtran las que el usuario ya creó (por `key`, guardado en ninguna parte del
// modelo — el match es por nombre para evitar duplicados obvios).
export interface RecorteTemplate {
  key: string
  name: string
  prompt: string
  icon: string
  color: string
  outputFormat: RecorteOutputFormat
  period: PeriodFilter
}

export const RECORTE_TEMPLATES: RecorteTemplate[] = [
  {
    key: 'ant-spend',
    name: 'Gasto hormiga',
    prompt:
      'Detectá dónde estoy haciendo muchas compras chicas y frecuentes que juntas suman bastante. Decime cuánto suman y cuánto podría ahorrar espaciándolas.',
    icon: '🐜',
    color: '#ff7043',
    outputFormat: RecorteOutputFormat.Amount,
    period: PeriodFilter.ThreeMonths,
  },
  {
    key: 'subscriptions',
    name: 'Suscripciones a revisar',
    prompt:
      'Listá mis pagos recurrentes y marcá cuáles podrían ser candidatos a cancelar por poco uso o por ser redundantes.',
    icon: '🔁',
    color: '#42a5f5',
    outputFormat: RecorteOutputFormat.List,
    period: PeriodFilter.Month,
  },
  {
    key: 'top-growth',
    name: 'Categoría que más creció',
    prompt:
      'Comparado con el período anterior, ¿qué categoría de gasto creció más? Decime en cuánto subió y qué la está empujando.',
    icon: '📈',
    color: '#ab47bc',
    outputFormat: RecorteOutputFormat.Text,
    period: PeriodFilter.ThreeMonths,
  },
  {
    key: 'variable-health',
    name: 'Salud del gasto variable',
    prompt:
      'Dame un semáforo del estado de mi gasto variable comparado con el período anterior: bien, atención o alerta, con una frase que lo explique.',
    icon: '🚦',
    color: '#66bb6a',
    outputFormat: RecorteOutputFormat.Badge,
    period: PeriodFilter.Month,
  },
  {
    key: 'concentration',
    name: 'Concentración del gasto',
    prompt:
      '¿Qué parte de mi gasto variable se concentra en una sola categoría? Si hay una muy dominante, decime cuánto ahorraría recortándola un 10%.',
    icon: '🎯',
    color: '#ec407a',
    outputFormat: RecorteOutputFormat.Amount,
    period: PeriodFilter.Month,
  },
]
