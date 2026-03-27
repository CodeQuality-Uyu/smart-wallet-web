// src/services/metricsService.ts

import { getMetricsBackend } from '@/backend'
import type { MetricsSummary } from '@/types/models'
import { MetricsPeriod } from '@/types/enums'

export const metricsService = {
  async getSummary(period: MetricsPeriod = MetricsPeriod.Month): Promise<MetricsSummary> {
    return (await getMetricsBackend()).getSummary(period)
  },
}
