// src/backend/msw/budget.ts
import { httpClient } from '@/api/httpClient'
import type { IBudgetBackend } from '../types'
import type { BudgetSettings } from '@/types/models'

export const mswBudgetBackend: IBudgetBackend = {
  async get(): Promise<BudgetSettings> {
    const { data } = await httpClient.get<BudgetSettings>('/budget')
    return data
  },

  async set(settings: BudgetSettings): Promise<BudgetSettings> {
    const { data } = await httpClient.put<BudgetSettings>('/budget', settings)
    return data
  },
}
