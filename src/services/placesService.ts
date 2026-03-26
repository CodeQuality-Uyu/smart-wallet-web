// src/services/placesService.ts

import { httpClient } from '@/api/httpClient'
import type { Place, CreatePlacePayload, UpdatePlacePayload } from '@/types/models'
import type { LocaleFilterPeriod } from '@/types/enums'

const BASE = '/places'

export const placesService = {
  async list(period?: LocaleFilterPeriod): Promise<Place[]> {
    const { data } = await httpClient.get<Place[]>(BASE, { params: { period } })
    return data
  },

  async create(payload: CreatePlacePayload): Promise<Place> {
    const { data } = await httpClient.post<Place>(BASE, payload)
    return data
  },

  async update(id: string, payload: UpdatePlacePayload): Promise<Place> {
    const { data } = await httpClient.patch<Place>(`${BASE}/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${BASE}/${id}`)
  },
}
