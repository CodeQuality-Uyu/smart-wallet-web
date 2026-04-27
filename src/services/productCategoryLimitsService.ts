// src/services/productCategoryLimitsService.ts
import { getProductCategoryLimitsBackend } from '@/backend'
import type { ProductCategoryLimits } from '@/backend/types'

export const productCategoryLimitsService = {
  async get(): Promise<ProductCategoryLimits> {
    return (await getProductCategoryLimitsBackend()).get()
  },
  async set(limits: ProductCategoryLimits): Promise<ProductCategoryLimits> {
    return (await getProductCategoryLimitsBackend()).set(limits)
  },
}
