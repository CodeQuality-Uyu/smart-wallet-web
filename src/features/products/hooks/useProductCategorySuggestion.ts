// src/features/products/hooks/useProductCategorySuggestion.ts

import { useCategorySuggestion } from '@/hooks/useCategorySuggestion'
import { suggestProductCategory, type CategorySuggestionResult } from '@/services/geminiService'
import type { ProductCategory } from '@/types/models'

export function useProductCategorySuggestion(
  name: string,
  categories: ProductCategory[],
): {
  suggestion: CategorySuggestionResult | undefined
  isLoading: boolean
} {
  return useCategorySuggestion(
    name,
    'gemini-product-category-suggestion',
    () => suggestProductCategory(name, categories),
    categories.length > 0,
  )
}
