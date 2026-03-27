// src/tests/mocks/data/expenses.ts

import type { Expense } from '@/types/models'
import { Currency } from '@/types/enums'

export const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    description: 'Almuerzo McDonald\'s',
    amount: 12.9,
    currency: Currency.USD,
    cardId: 'card-2',
    categoryIds: ['cat-1', 'cat-2'],
    placeId: 'place-1',
    date: '2026-03-23',
    receiptUrl: undefined,
    ticketLines: [
      { id: 'tl-1', name: 'Big Mac', amount: 5.9 },
      { id: 'tl-2', name: 'Papas fritas', amount: 3.5 },
      { id: 'tl-3', name: 'Bebida', amount: 2.4 },
    ],
    createdAt: '2026-03-23T13:20:00Z',
    updatedAt: '2026-03-23T13:20:00Z',
  },
  {
    id: 'exp-2',
    description: 'STM bus',
    amount: 45,
    currency: Currency.UYU,
    cardId: 'card-3',
    categoryIds: ['cat-3'],
    placeId: undefined,
    date: '2026-03-23',
    receiptUrl: undefined,
    ticketLines: [],
    createdAt: '2026-03-23T08:45:00Z',
    updatedAt: '2026-03-23T08:45:00Z',
  },
  {
    id: 'exp-3',
    description: 'Farmacia Cruz Verde',
    amount: 230,
    currency: Currency.UYU,
    cardId: 'card-4',
    categoryIds: ['cat-4'],
    placeId: 'place-3',
    date: '2026-03-22',
    receiptUrl: undefined,
    ticketLines: [],
    createdAt: '2026-03-22T15:00:00Z',
    updatedAt: '2026-03-22T15:00:00Z',
  },
]
