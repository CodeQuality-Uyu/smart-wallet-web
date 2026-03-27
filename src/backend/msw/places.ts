// src/backend/msw/places.ts
// Places backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type { IPlacesBackend, Place, CreatePlacePayload, UpdatePlacePayload } from '../types'

export const mswPlacesBackend: IPlacesBackend = {
  async list(): Promise<Place[]> {
    const { data } = await httpClient.get<Place[]>('/places')
    return data
  },

  async create(payload: CreatePlacePayload): Promise<Place> {
    const { data } = await httpClient.post<Place>('/places', payload)
    return data
  },

  async update(id: string, payload: UpdatePlacePayload): Promise<Place> {
    const { data } = await httpClient.patch<Place>(`/places/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/places/${id}`)
  },
}
