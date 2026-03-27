// src/services/budgetService.ts
import { getBudgetBackend } from '@/backend'
import type { BudgetSettings } from '@/types/models'

export const budgetService = {
  async get(): Promise<BudgetSettings> {
    return (await getBudgetBackend()).get()
  },
  async set(settings: BudgetSettings): Promise<BudgetSettings> {
    return (await getBudgetBackend()).set(settings)
  },
}
