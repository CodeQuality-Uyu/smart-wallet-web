// src/backend/msw/categoryLimits.ts
import { httpClient } from '@/api/httpClient'
import type { ICategoryLimitsBackend } from '../types'
import type { CategoryLimits } from '@/types/models'

export const mswCategoryLimitsBackend: ICategoryLimitsBackend = {
  async get(): Promise<CategoryLimits> {
    const { data } = await httpClient.get<CategoryLimits>('/category-limits')
    return data
  },

  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    const { data } = await httpClient.put<CategoryLimits>('/category-limits', limits)
    return data
  },
}
