// src/backend/msw/productCategoryLimits.ts
import { httpClient } from '@/api/httpClient'
import type { ICategoryLimitsBackend } from '../types'
import type { CategoryLimits } from '@/types/models'

export const mswProductCategoryLimitsBackend: ICategoryLimitsBackend = {
  async get(): Promise<CategoryLimits> {
    const { data } = await httpClient.get<CategoryLimits>('/product-category-limits')
    return data
  },

  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    const { data } = await httpClient.put<CategoryLimits>('/product-category-limits', limits)
    return data
  },
}
