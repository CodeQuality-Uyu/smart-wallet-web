// src/services/cardsService.ts
// Thin delegator — all logic lives in the active backend implementation.

import { getCardsBackend } from '@/backend'
import type { Card, CreateCardPayload, UpdateCardPayload } from '@/backend/types'

export type { Card, CreateCardPayload, UpdateCardPayload }

export const cardsService = {
  async list(): Promise<Card[]> {
    return (await getCardsBackend()).list()
  },

  async create(payload: CreateCardPayload): Promise<Card> {
    return (await getCardsBackend()).create(payload)
  },

  async update(id: string, payload: UpdateCardPayload): Promise<Card> {
    return (await getCardsBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getCardsBackend()).remove(id)
  },
}
