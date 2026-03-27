// src/services/categoriesService.ts

import { getCategoriesBackend } from '@/backend'
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/models'

export const categoriesService = {
  async list(): Promise<Category[]> {
    return (await getCategoriesBackend()).list()
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    return (await getCategoriesBackend()).create(payload)
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    return (await getCategoriesBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getCategoriesBackend()).remove(id)
  },
}
