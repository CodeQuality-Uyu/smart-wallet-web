// src/backend/msw/productCategories.ts

import { httpClient } from '@/api/httpClient'
import type {
  IProductCategoriesBackend,
  ProductCategory,
  CreateProductCategoryPayload,
  UpdateProductCategoryPayload,
} from '../types'

export const mswProductCategoriesBackend: IProductCategoriesBackend = {
  async list(): Promise<ProductCategory[]> {
    const { data } = await httpClient.get<ProductCategory[]>('/product-categories')
    return data
  },

  async create(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    const { data } = await httpClient.post<ProductCategory>('/product-categories', payload)
    return data
  },

  async update(id: string, payload: UpdateProductCategoryPayload): Promise<ProductCategory> {
    const { data } = await httpClient.patch<ProductCategory>(`/product-categories/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/product-categories/${id}`)
  },
}
