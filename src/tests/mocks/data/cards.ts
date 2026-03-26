// src/tests/mocks/data/cards.ts
import type { Card } from '@/types/models'
import { CardType } from '@/types/enums'

export const mockCards: Card[] = [
  { id: 'card-1', name: 'Transferencia', type: CardType.Transfer, bank: 'N/A', lastFour: undefined, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'card-2', name: 'Itaú Crédito', type: CardType.Credit, bank: 'Itaú', lastFour: '4291', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'card-3', name: 'Itaú Débito', type: CardType.Debit, bank: 'Itaú', lastFour: '7823', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'card-4', name: 'Santander Crédito', type: CardType.Credit, bank: 'Santander', lastFour: '5514', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]
