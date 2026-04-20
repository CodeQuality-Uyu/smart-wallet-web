// src/features/expenses/hooks/useCategorySuggestion.ts

import { useCategorySuggestion as useGeminiSuggestion } from '@/hooks/useCategorySuggestion'
import { suggestCategory, type CategorySuggestionResult } from '@/services/geminiService'
import type { Category } from '@/types/models'

export function useCategorySuggestion(
  description: string,
  categories: Category[],
): {
  suggestion: CategorySuggestionResult | undefined
  isLoading: boolean
} {
  return useGeminiSuggestion(
    description,
    'gemini-category-suggestion',
    () => suggestCategory(description, categories),
    categories.length > 0,
  )
}
