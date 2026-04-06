// src/backend/msw/productCategoryLimits.ts
import { httpClient } from '@/api/httpClient'
import type { ICategoryLimitsBackend, ProductCategoryLimits } from '../types'

export const mswProductCategoryLimitsBackend: ICategoryLimitsBackend = {
  async get(): Promise<ProductCategoryLimits> {
    const { data } = await httpClient.get<ProductCategoryLimits>('/product-category-limits')
    return data
  },

  async set(limits: ProductCategoryLimits): Promise<ProductCategoryLimits> {
    const { data } = await httpClient.put<ProductCategoryLimits>('/product-category-limits', limits)
    return data
  },
}
