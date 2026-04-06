// src/features/products/hooks/usePriceHistory.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsService } from '@/services/productsService'
import type { ProductPriceRecord, CreateProductPriceRecordPayload, Place } from '@/types/models'
import type { PriceByPlace } from '@/backend/types'
import { PLACE_KEYS } from '@/features/places/hooks/usePlaces'

export const PRICE_HISTORY_KEYS = {
  history:    (productId: string) => ['priceHistory', productId] as const,
  byPlace:    (productId: string) => ['priceByPlace', productId] as const,
} as const

export function usePriceHistory(productId: string) {
  return useQuery({
    queryKey: PRICE_HISTORY_KEYS.history(productId),
    queryFn: () => productsService.getPriceHistory(productId),
    enabled: !!productId,
  })
}

export function usePriceByPlace(productId: string) {
  return useQuery<PriceByPlace[]>({
    queryKey: PRICE_HISTORY_KEYS.byPlace(productId),
    queryFn: () => productsService.getPriceByPlace(productId),
    enabled: !!productId,
  })
}

export function useUpdatePriceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, unitPrice, currency }: {
      id: string
      unitPrice: number
      currency: import('@/types/enums').Currency
      productId: string
      placeId: string
    }) => productsService.updatePriceRecord(id, { unitPrice, currency }),
    onSuccess: (record) => {
      // Update the record in price history cache
      qc.setQueryData<ProductPriceRecord[]>(
        PRICE_HISTORY_KEYS.history(record.productId),
        (prev) => prev?.map((r) => r.id === record.id ? record : r) ?? [],
      )
      // Update price-by-place cache
      qc.setQueryData<PriceByPlace[]>(
        PRICE_HISTORY_KEYS.byPlace(record.productId),
        (prev) => {
          if (!prev) return prev
          const updated = prev.map((r) =>
            r.placeId === record.placeId
              ? { ...r, unitPrice: record.unitPrice, currency: record.currency }
              : r,
          )
          const minPrice = Math.min(...updated.map((r) => r.unitPrice))
          return updated.map((r) => ({
            ...r,
            diffPct: minPrice > 0 ? Math.round(((r.unitPrice - minPrice) / minPrice) * 100) : 0,
          }))
        },
      )
    },
  })
}

export function useAddPriceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductPriceRecordPayload) => productsService.addPriceRecord(payload),
    onSuccess: (record) => {
      // Update price history cache
      qc.setQueryData<ProductPriceRecord[]>(
        PRICE_HISTORY_KEYS.history(record.productId),
        (prev) => [record, ...(prev ?? [])],
      )

      // Update price-by-place cache directly (avoid refetch)
      qc.setQueryData<PriceByPlace[]>(
        PRICE_HISTORY_KEYS.byPlace(record.productId),
        (prev) => {
          const existing = prev ?? []

          // Resolve place name from cached places list or existing row
          const places = qc.getQueryData<Place[]>(PLACE_KEYS.list()) ?? []
          const placeName =
            existing.find((r) => r.placeId === record.placeId)?.placeName ??
            places.find((p) => p.id === record.placeId)?.name ??
            record.placeId

          const newRow: PriceByPlace = {
            placeId: record.placeId,
            placeName,
            unitPrice: record.unitPrice,
            currency: record.currency,
            recordedAt: record.recordedAt,
            diffPct: 0,
          }

          // Replace existing row for this place (or append)
          const updated = [
            ...existing.filter((r) => r.placeId !== record.placeId),
            newRow,
          ]

          // Recalculate diffPct
          const minPrice = Math.min(...updated.map((r) => r.unitPrice))
          return updated.map((r) => ({
            ...r,
            diffPct: minPrice > 0 ? Math.round(((r.unitPrice - minPrice) / minPrice) * 100) : 0,
          }))
        },
      )
    },
  })
}
