// src/hooks/useMetrics.ts

import { useQuery } from '@tanstack/react-query'
import { metricsService } from '@/services/metricsService'
import { MetricsPeriod } from '@/types/enums'

export const METRICS_KEYS = {
  all: ['metrics'] as const,
  summary: (period: MetricsPeriod, yearMonth?: string) => ['metrics', 'summary', period, yearMonth ?? ''] as const,
} as const

export function useMetrics(period: MetricsPeriod = MetricsPeriod.Month, yearMonth?: string) {
  return useQuery({
    queryKey: METRICS_KEYS.summary(period, yearMonth),
    queryFn: () => metricsService.getSummary(period, yearMonth),
  })
}
