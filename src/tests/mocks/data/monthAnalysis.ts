// src/tests/mocks/data/monthAnalysis.ts

import type { MonthAnalysis } from '@/types/models'

export const mockMonthAnalyses: MonthAnalysis[] = [
  {
    yearMonth: '2026-03',
    generatedAt: '2026-04-02T10:00:00Z',
    summary: 'Marzo estuvo bastante movido. La mayor parte de la plata se fue en Supermercado y Restaurantes, que juntos representaron casi el 60% del gasto total. Los servicios fijos se mantuvieron estables.',
    unnecessary: {
      insights: [
        { category: 'Restaurantes', insight: 'Hubo bastantes salidas a comer, varias de ellas en días de semana. Cocinar en casa algunos de esos días te puede ahorrar bastante.' },
      ],
      note: '',
    },
    reducible: {
      insights: [
        { category: 'Streaming', insight: 'Tenés más de una suscripción activa. Vale la pena revisar cuáles usás de verdad.' },
      ],
      note: '',
    },
    preventable: 'No hubo gastos excepcionales este mes. El patrón es bastante consistente con meses anteriores, así que es un buen punto de partida para ajustar hábitos.',
  },
]
