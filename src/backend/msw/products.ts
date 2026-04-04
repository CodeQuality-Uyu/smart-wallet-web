// src/backend/msw/products.ts

import { httpClient } from '@/api/httpClient'
import type { Currency } from '@/types/enums'
import type {
  IProductsBackend,
  GlobalProductSuggestion,
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductsFilter,
  ProductPriceRecord,
  CreateProductPriceRecordPayload,
  PriceByPlace,
} from '../types'

export const mswProductsBackend: IProductsBackend = {
  async list(filters?: ProductsFilter): Promise<Product[]> {
    const params = new URLSearchParams()
    if (filters?.search)     params.set('search', filters.search)
    if (filters?.categoryId) params.set('categoryId', filters.categoryId)
    if (filters?.brandId)    params.set('brandId', filters.brandId)
    const qs = params.toString()
    const { data } = await httpClient.get<Product[]>(`/products${qs ? `?${qs}` : ''}`)
    return data
  },

  async getById(id: string): Promise<Product> {
    const { data } = await httpClient.get<Product>(`/products/${id}`)
    return data
  },

  async searchGlobal(query: string): Promise<GlobalProductSuggestion[]> {
    const { data } = await httpClient.get<GlobalProductSuggestion[]>(
      `/products/global?q=${encodeURIComponent(query)}`,
    )
    return data
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const { data } = await httpClient.post<Product>('/products', payload)
    return data
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    const { data } = await httpClient.patch<Product>(`/products/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/products/${id}`)
  },

  async getPriceHistory(globalProductId: string): Promise<ProductPriceRecord[]> {
    const { data } = await httpClient.get<ProductPriceRecord[]>(`/products/${globalProductId}/price-history`)
    return data
  },

  async getPriceByPlace(globalProductId: string): Promise<PriceByPlace[]> {
    const { data } = await httpClient.get<PriceByPlace[]>(`/products/${globalProductId}/price-by-place`)
    return data
  },

  async addPriceRecord(payload: CreateProductPriceRecordPayload): Promise<ProductPriceRecord> {
    const { data } = await httpClient.post<ProductPriceRecord>(
      `/products/${payload.productId}/price-history`,
      payload,
    )
    return data
  },

  async updatePriceRecord(id: string, payload: { unitPrice: number; currency: Currency }): Promise<ProductPriceRecord> {
    const { data } = await httpClient.patch<ProductPriceRecord>(`/price-history/${id}`, payload)
    return data
  },
}
