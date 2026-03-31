// src/services/productCategoriesService.ts

import { getProductCategoriesBackend } from '@/backend'
import type { ProductCategory, CreateProductCategoryPayload, UpdateProductCategoryPayload } from '@/types/models'

export const productCategoriesService = {
  async list(): Promise<ProductCategory[]> {
    return (await getProductCategoriesBackend()).list()
  },

  async create(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    return (await getProductCategoriesBackend()).create(payload)
  },

  async update(id: string, payload: UpdateProductCategoryPayload): Promise<ProductCategory> {
    return (await getProductCategoriesBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getProductCategoriesBackend()).remove(id)
  },
}
