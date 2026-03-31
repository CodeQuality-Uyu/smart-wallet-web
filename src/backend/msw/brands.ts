// src/backend/msw/brands.ts

import { httpClient } from '@/api/httpClient'
import type { IBrandsBackend, Brand, CreateBrandPayload, UpdateBrandPayload } from '../types'

export const mswBrandsBackend: IBrandsBackend = {
  async list(): Promise<Brand[]> {
    const { data } = await httpClient.get<Brand[]>('/brands')
    return data
  },

  async search(query: string): Promise<Brand[]> {
    const { data } = await httpClient.get<Brand[]>(`/brands?search=${encodeURIComponent(query)}`)
    return data
  },

  async create(payload: CreateBrandPayload): Promise<Brand> {
    const { data } = await httpClient.post<Brand>('/brands', payload)
    return data
  },

  async update(id: string, payload: UpdateBrandPayload): Promise<Brand> {
    const { data } = await httpClient.patch<Brand>(`/brands/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/brands/${id}`)
  },
}
