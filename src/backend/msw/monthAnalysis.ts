// src/backend/msw/monthAnalysis.ts

import { httpClient } from '@/api/httpClient'
import type { IMonthAnalysisBackend } from '../types'
import type { MonthAnalysis } from '@/types/models'

export const mswMonthAnalysisBackend: IMonthAnalysisBackend = {
  async get(yearMonth: string): Promise<MonthAnalysis | null> {
    try {
      const { data } = await httpClient.get<MonthAnalysis>(`/month-analysis/${yearMonth}`)
      return data
    } catch {
      return null
    }
  },

  async save(analysis: MonthAnalysis): Promise<MonthAnalysis> {
    const { data } = await httpClient.put<MonthAnalysis>(`/month-analysis/${analysis.yearMonth}`, analysis)
    return data
  },
}
