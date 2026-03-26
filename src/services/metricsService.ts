// src/services/metricsService.ts

import { httpClient } from '@/api/httpClient'
import type { MetricsSummary } from '@/types/models'
import { MetricsPeriod } from '@/types/enums'

const BASE = '/metrics'

export const metricsService = {
  async getSummary(period: MetricsPeriod = MetricsPeriod.Month): Promise<MetricsSummary> {
    const { data } = await httpClient.get<MetricsSummary>(BASE, { params: { period } })
    return data
  },
}
