// src/hooks/useProductProductCategoryLimits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productProductCategoryLimitsService } from '@/services/productProductCategoryLimitsService'
import type { ProductProductCategoryLimits } from '@/backend/types'

export const PRODUCT_CATEGORY_LIMITS_KEY = ['productProductCategoryLimits'] as const

export function useProductProductCategoryLimits() {
  return useQuery({
    queryKey: PRODUCT_CATEGORY_LIMITS_KEY,
    queryFn: () => productProductCategoryLimitsService.get(),
  })
}

export function useSetProductProductCategoryLimits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (limits: ProductCategoryLimits) => productProductCategoryLimitsService.set(limits),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_CATEGORY_LIMITS_KEY }),
  })
}
