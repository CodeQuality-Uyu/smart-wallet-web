// src/services/categoryLimitsService.ts
import { getCategoryLimitsBackend } from '@/backend'
import type { CategoryLimits } from '@/types/models'

export const categoryLimitsService = {
  async get(): Promise<CategoryLimits> {
    return (await getCategoryLimitsBackend()).get()
  },
  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    return (await getCategoryLimitsBackend()).set(limits)
  },
}
