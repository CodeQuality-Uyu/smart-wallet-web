// src/hooks/useCategoryLimits.ts
// Derives category limits from the Category model (Category.limitUYU / limitUSD).
// Returns only categories that have at least one limit configured.

import { useMemo } from 'react'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { Currency } from '@/types/enums'

export type CategoryLimitEntry = Partial<Record<Currency, number>>
export type CategoryLimitsMap = Record<string, CategoryLimitEntry>

export function useCategoryLimits(): { data: CategoryLimitsMap; isLoading: boolean } {
  const { data: categories = [], isLoading } = useCategories()

  const data = useMemo<CategoryLimitsMap>(() => {
    const result: CategoryLimitsMap = {}
    for (const cat of categories) {
      if (cat.limitUYU || cat.limitUSD) {
        result[cat.id] = {
          ...(cat.limitUYU ? { [Currency.UYU]: cat.limitUYU } : {}),
          ...(cat.limitUSD ? { [Currency.USD]: cat.limitUSD } : {}),
        }
      }
    }
    return result
  }, [categories])

  return { data, isLoading }
}
