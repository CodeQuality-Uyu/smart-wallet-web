// src/features/products/hooks/usePriceHistory.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsService } from '@/services/productsService'
import type { ProductPriceRecord, CreateProductPriceRecordPayload } from '@/types/models'
import type { PriceByPlace } from '@/backend/types'

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

export function useAddPriceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductPriceRecordPayload) => productsService.addPriceRecord(payload),
    onSuccess: (record) => {
      // Prepend to history cache
      qc.setQueryData<ProductPriceRecord[]>(
        PRICE_HISTORY_KEYS.history(record.productId),
        (prev) => [record, ...(prev ?? [])],
      )
      // Invalidate by-place so diffPct recalculates
      void qc.invalidateQueries({ queryKey: PRICE_HISTORY_KEYS.byPlace(record.productId) })
    },
  })
}
