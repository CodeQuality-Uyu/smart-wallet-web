// src/services/productCategoryLimitsService.ts
import { getProductCategoryLimitsBackend } from '@/backend'
import type { CategoryLimits } from '@/types/models'

export const productCategoryLimitsService = {
  async get(): Promise<CategoryLimits> {
    return (await getProductCategoryLimitsBackend()).get()
  },
  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    return (await getProductCategoryLimitsBackend()).set(limits)
  },
}
