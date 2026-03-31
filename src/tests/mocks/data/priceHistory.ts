// src/tests/mocks/data/priceHistory.ts
import type { ProductPriceRecord } from '@/types/models'
import { Currency } from '@/types/enums'

// Helpers — fechas relativas a 2026-03-31 (fecha actual del proyecto)
const d = (daysAgo: number): string => {
  const date = new Date('2026-03-31T12:00:00Z')
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0] as string
}

export const mockPriceHistory: ProductPriceRecord[] = [
  // ── prod-1 Papa Blanca en place-2 (Disco Pocitos) ──────────────────
  // fresh (10 días)
  {
    id: 'ph-1',
    productId: 'prod-1',
    placeId: 'place-2',
    unitPrice: 42,
    currency: Currency.UYU,
    recordedAt: d(10),
    createdAt: d(10),
  },
  // stale (45 días)
  {
    id: 'ph-2',
    productId: 'prod-1',
    placeId: 'place-2',
    unitPrice: 38,
    currency: Currency.UYU,
    recordedAt: d(45),
    createdAt: d(45),
  },
  // old (120 días)
  {
    id: 'ph-3',
    productId: 'prod-1',
    placeId: 'place-2',
    unitPrice: 31,
    currency: Currency.UYU,
    recordedAt: d(120),
    createdAt: d(120),
  },

  // ── prod-1 Papa Blanca en place-3 (Farmacia Cruz Verde — sin sentido real, datos demo) ──
  // fresh (5 días)
  {
    id: 'ph-4',
    productId: 'prod-1',
    placeId: 'place-3',
    unitPrice: 47,
    currency: Currency.UYU,
    recordedAt: d(5),
    createdAt: d(5),
  },
  // stale (60 días)
  {
    id: 'ph-5',
    productId: 'prod-1',
    placeId: 'place-3',
    unitPrice: 40,
    currency: Currency.UYU,
    recordedAt: d(60),
    createdAt: d(60),
  },
  // old (200 días)
  {
    id: 'ph-6',
    productId: 'prod-1',
    placeId: 'place-3',
    unitPrice: 28,
    currency: Currency.UYU,
    recordedAt: d(200),
    createdAt: d(200),
  },

  // ── prod-4 Leche Conaprole 1L en place-2 ──────────────────────────
  // fresh (15 días)
  {
    id: 'ph-7',
    productId: 'prod-4',
    placeId: 'place-2',
    unitPrice: 89,
    currency: Currency.UYU,
    recordedAt: d(15),
    createdAt: d(15),
  },
  // fresh (3 días) — mismo local, registro más reciente
  {
    id: 'ph-8',
    productId: 'prod-4',
    placeId: 'place-2',
    unitPrice: 92,
    currency: Currency.UYU,
    recordedAt: d(3),
    createdAt: d(3),
  },

  // ── prod-4 Leche Conaprole 1L en place-1 (McDonald's WTC) ─────────
  // stale (50 días)
  {
    id: 'ph-9',
    productId: 'prod-4',
    placeId: 'place-1',
    unitPrice: 95,
    currency: Currency.UYU,
    recordedAt: d(50),
    createdAt: d(50),
  },

  // ── prod-3 Queso Dambo en place-2 ────────────────────────────────
  // old (95 días)
  {
    id: 'ph-10',
    productId: 'prod-3',
    placeId: 'place-2',
    unitPrice: 380,
    currency: Currency.UYU,
    recordedAt: d(95),
    createdAt: d(95),
  },
]
