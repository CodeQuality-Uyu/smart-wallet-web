// src/services/categoriesService.ts

import { httpClient } from '@/api/httpClient'
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/models'

const BASE = '/categories'

export const categoriesService = {
  async list(): Promise<Category[]> {
    const { data } = await httpClient.get<Category[]>(BASE)
    return data
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const { data } = await httpClient.post<Category>(BASE, payload)
    return data
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const { data } = await httpClient.patch<Category>(`${BASE}/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${BASE}/${id}`)
  },
}
