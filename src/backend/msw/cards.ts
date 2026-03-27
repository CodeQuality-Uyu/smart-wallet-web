// src/backend/msw/cards.ts
// Cards backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type { ICardsBackend, Card, CreateCardPayload } from '../types'

export const mswCardsBackend: ICardsBackend = {
  async list(): Promise<Card[]> {
    const { data } = await httpClient.get<Card[]>('/cards')
    return data
  },

  async create(payload: CreateCardPayload): Promise<Card> {
    const { data } = await httpClient.post<Card>('/cards', payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/cards/${id}`)
  },
}
