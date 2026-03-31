// src/services/brandsService.ts

import { getBrandsBackend } from '@/backend'
import type { Brand, CreateBrandPayload, UpdateBrandPayload } from '@/types/models'

export const brandsService = {
  async list(): Promise<Brand[]> {
    return (await getBrandsBackend()).list()
  },

  async search(query: string): Promise<Brand[]> {
    return (await getBrandsBackend()).search(query)
  },

  async create(payload: CreateBrandPayload): Promise<Brand> {
    return (await getBrandsBackend()).create(payload)
  },

  async update(id: string, payload: UpdateBrandPayload): Promise<Brand> {
    return (await getBrandsBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getBrandsBackend()).remove(id)
  },
}
