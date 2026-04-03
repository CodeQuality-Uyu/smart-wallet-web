// src/services/metricsService.ts

import { getMetricsBackend } from '@/backend'
import type { MetricsSummary } from '@/types/models'
import { PeriodFilter } from '@/types/enums'

export const metricsService = {
  async getSummary(
    period: PeriodFilter = PeriodFilter.Month,
    yearMonth?: string
  ): Promise<MetricsSummary> {
    return (await getMetricsBackend()).getSummary(period, yearMonth)
  },
}
