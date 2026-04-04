// src/hooks/useProductCategoryLimits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productCategoryLimitsService } from '@/services/productCategoryLimitsService'
import type { CategoryLimits } from '@/types/models'

export const PRODUCT_CATEGORY_LIMITS_KEY = ['productCategoryLimits'] as const

export function useProductCategoryLimits() {
  return useQuery({
    queryKey: PRODUCT_CATEGORY_LIMITS_KEY,
    queryFn: () => productCategoryLimitsService.get(),
  })
}

export function useSetProductCategoryLimits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (limits: CategoryLimits) => productCategoryLimitsService.set(limits),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_CATEGORY_LIMITS_KEY }),
  })
}
