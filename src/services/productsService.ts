// src/services/productsService.ts

import { getProductsBackend } from '@/backend'
import type {
  Product, CreateProductPayload, UpdateProductPayload,
  ProductPriceRecord, CreateProductPriceRecordPayload,
} from '@/types/models'
import type { ProductsFilter, PriceByPlace } from '@/backend/types'

export const productsService = {
  async list(filters?: ProductsFilter): Promise<Product[]> {
    return (await getProductsBackend()).list(filters)
  },

  async getById(id: string): Promise<Product> {
    return (await getProductsBackend()).getById(id)
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    return (await getProductsBackend()).create(payload)
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    return (await getProductsBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getProductsBackend()).remove(id)
  },

  async getPriceHistory(productId: string): Promise<ProductPriceRecord[]> {
    return (await getProductsBackend()).getPriceHistory(productId)
  },

  async getPriceByPlace(productId: string): Promise<PriceByPlace[]> {
    return (await getProductsBackend()).getPriceByPlace(productId)
  },

  async addPriceRecord(payload: CreateProductPriceRecordPayload): Promise<ProductPriceRecord> {
    return (await getProductsBackend()).addPriceRecord(payload)
  },
}
