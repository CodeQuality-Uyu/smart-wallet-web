// src/hooks/useCategoryLimits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryLimitsService } from '@/services/categoryLimitsService'
import type { CategoryLimits } from '@/types/models'

export const CATEGORY_LIMITS_KEY = ['categoryLimits'] as const

export function useCategoryLimits() {
  return useQuery({
    queryKey: CATEGORY_LIMITS_KEY,
    queryFn: () => categoryLimitsService.get(),
  })
}

export function useSetCategoryLimits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (limits: CategoryLimits) => categoryLimitsService.set(limits),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORY_LIMITS_KEY }),
  })
}
