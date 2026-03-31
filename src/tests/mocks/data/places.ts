// src/tests/mocks/data/places.ts
import type { GlobalPlace, Place } from '@/types/models'

export const mockGlobalPlaces: GlobalPlace[] = [
  { id: 'gplace-1', name: "McDonald's WTC", nameLower: "mcdonald's wtc", address: 'WTC Shopping · Montevideo', icon: '🍔', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'gplace-2', name: 'Disco Pocitos', nameLower: 'disco pocitos', address: 'Av. Brasil · Pocitos', icon: '🛒', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'gplace-3', name: 'Farmacia Cruz Verde', nameLower: 'farmacia cruz verde', address: 'Pocitos · Montevideo', icon: '💊', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'gplace-4', name: 'Online', nameLower: 'online', address: undefined, icon: '🌐', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'gplace-5', name: 'Tienda Inglesa', nameLower: 'tienda inglesa', address: 'Montevideo', icon: '🛒', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'gplace-6', name: 'Devoto', nameLower: 'devoto', address: 'Montevideo', icon: '🛒', createdAt: '2026-01-01T00:00:00Z' },
]

export const mockPlaces: Place[] = [
  { id: 'place-1', name: "McDonald's WTC", address: 'WTC Shopping · Montevideo', icon: '🍔', visitCount: 12, active: true, globalPlaceId: 'gplace-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-2', name: 'Disco Pocitos', address: 'Av. Brasil · Pocitos', icon: '🛒', visitCount: 8, active: true, globalPlaceId: 'gplace-2', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-3', name: 'Farmacia Cruz Verde', address: 'Pocitos · Montevideo', icon: '💊', visitCount: 5, active: true, globalPlaceId: 'gplace-3', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'place-4', name: 'Online', address: undefined, icon: '🌐', visitCount: 7, active: true, globalPlaceId: 'gplace-4', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]
