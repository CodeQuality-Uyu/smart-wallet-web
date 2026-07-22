// src/tests/mocks/data/recortes.ts
import type { Recorte, RecorteResult } from '@/types/models'
import {
  Currency,
  PeriodFilter,
  RecorteOutputFormat,
  RecorteBadgeLevel,
} from '@/types/enums'

export const mockRecortes: Recorte[] = [
  {
    id: 'recorte-1',
    name: 'Gasto hormiga en delivery',
    description: 'Compras chicas y frecuentes de comida a domicilio que suman más de lo que parece.',
    prompt:
      'Detectá si estoy gastando mucho en pedidos de comida chicos y frecuentes. Decime cuánto suman y cuánto podría ahorrar espaciándolos.',
    icon: '🐜',
    color: '#ff7043',
    outputFormat: RecorteOutputFormat.Amount,
    period: PeriodFilter.ThreeMonths,
    active: true,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-07-10T10:00:00Z',
    lastResult: {
      id: 'result-1',
      generatedAt: '2026-07-10T10:00:00Z',
      periodLabel: 'Últimos 3 meses',
      amount: 4200,
      currency: Currency.UYU,
      text: '38 pedidos que promedian $320 c/u. Bajando la frecuencia a la mitad ahorrarías cerca de $4.200.',
    },
  },
  {
    id: 'recorte-2',
    name: 'Suscripciones a revisar',
    description: 'Pagos recurrentes activos que quizás no estés usando.',
    prompt:
      'Listá mis pagos recurrentes y marcá cuáles podrían ser candidatos a cancelar por poco uso.',
    icon: '🔁',
    color: '#42a5f5',
    outputFormat: RecorteOutputFormat.List,
    period: PeriodFilter.Month,
    active: true,
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-07-05T10:00:00Z',
    lastResult: {
      id: 'result-2',
      generatedAt: '2026-07-05T10:00:00Z',
      periodLabel: 'Este mes',
      items: [
        { label: 'Streaming premium', detail: 'Tenés dos servicios de video simultáneos.', amount: 12, currency: Currency.USD },
        { label: 'Gimnasio', detail: 'Sin gastos asociados los últimos 2 meses.', amount: 1800, currency: Currency.UYU },
      ],
    },
  },
  {
    id: 'recorte-3',
    name: 'Salud del gasto variable',
    description: 'Estado general de tu gasto variable vs el período anterior.',
    prompt:
      'Dame un semáforo del estado de mi gasto variable comparado con el período anterior: bien, atención o alerta.',
    icon: '🚦',
    color: '#66bb6a',
    outputFormat: RecorteOutputFormat.Badge,
    period: PeriodFilter.Month,
    active: true,
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
    lastResult: {
      id: 'result-3',
      generatedAt: '2026-07-18T10:00:00Z',
      periodLabel: 'Este mes',
      badge: { level: RecorteBadgeLevel.Warning, label: 'Atención — subió 18%' },
      text: 'Tu gasto variable creció 18% respecto al mes pasado, empujado por Restaurantes.',
    },
  },
]

// Historial de resultados por recorte (más reciente primero se ordena en el handler).
export const mockRecorteResults: Record<string, RecorteResult[]> = {
  'recorte-1': [mockRecortes[0].lastResult!],
  'recorte-2': [mockRecortes[1].lastResult!],
  'recorte-3': [mockRecortes[2].lastResult!],
}
