// src/tests/mocks/data/places.ts
import type { Place } from '@/types/models'

export const mockPlaces: Place[] = [
  { id: 'place-1', name: "McDonald's WTC", address: 'WTC Shopping · Montevideo', visitCount: 12, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-2', name: 'Disco Pocitos', address: 'Av. Brasil · Pocitos', visitCount: 8, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-3', name: 'Farmacia Cruz Verde', address: 'Pocitos · Montevideo', visitCount: 5, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-4', name: 'Online', address: undefined, visitCount: 7, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]
