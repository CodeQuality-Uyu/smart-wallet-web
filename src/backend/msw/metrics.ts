// src/backend/msw/metrics.ts
// Metrics backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type { IMetricsBackend, MetricsSummary, MetricsPeriod } from '../types'

export const mswMetricsBackend: IMetricsBackend = {
  async getSummary(period: MetricsPeriod, yearMonth?: string): Promise<MetricsSummary> {
    const { data } = await httpClient.get<MetricsSummary>('/metrics', { params: { period, yearMonth } })
    return data
  },
}
