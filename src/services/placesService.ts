// src/services/placesService.ts

import { getPlacesBackend } from '@/backend'
import type { GlobalPlace, Place, CreatePlacePayload, UpdatePlacePayload } from '@/types/models'

export const placesService = {
  async list(): Promise<Place[]> {
    return (await getPlacesBackend()).list()
  },

  async searchGlobal(query: string): Promise<GlobalPlace[]> {
    return (await getPlacesBackend()).searchGlobal(query)
  },

  async create(payload: CreatePlacePayload): Promise<Place> {
    return (await getPlacesBackend()).create(payload)
  },

  async update(id: string, payload: UpdatePlacePayload): Promise<Place> {
    return (await getPlacesBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getPlacesBackend()).remove(id)
  },
}
