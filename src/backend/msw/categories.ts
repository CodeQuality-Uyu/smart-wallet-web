// src/backend/msw/categories.ts
// Categories backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type { ICategoriesBackend, Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types'

export const mswCategoriesBackend: ICategoriesBackend = {
  async list(): Promise<Category[]> {
    const { data } = await httpClient.get<Category[]>('/categories')
    return data
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const { data } = await httpClient.post<Category>('/categories', payload)
    return data
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const { data } = await httpClient.patch<Category>(`/categories/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/categories/${id}`)
  },
}
