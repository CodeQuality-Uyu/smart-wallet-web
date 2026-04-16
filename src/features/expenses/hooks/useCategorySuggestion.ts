// src/features/expenses/hooks/useCategorySuggestion.ts

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { suggestCategory, type CategorySuggestionResult } from '@/services/geminiService'
import type { Category } from '@/types/models'

const DEBOUNCE_MS = 500
const MIN_CHARS = 3

export function useCategorySuggestion(
  description: string,
  categories: Category[],
): {
  suggestion: CategorySuggestionResult | undefined
  isLoading: boolean
} {
  const [debouncedDesc, setDebouncedDesc] = useState('')

  useEffect(() => {
    if (description.length < MIN_CHARS) {
      setDebouncedDesc('')
      return
    }
    const timer = setTimeout(() => setDebouncedDesc(description), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [description])

  const { data, isFetching } = useQuery<CategorySuggestionResult>({
    queryKey: ['gemini-category-suggestion', debouncedDesc],
    queryFn: () => suggestCategory(debouncedDesc, categories),
    enabled: debouncedDesc.length >= MIN_CHARS && categories.length > 0,
    staleTime: 1000 * 60 * 5, // 5 min — same query for same text
    retry: false,
  })

  return { suggestion: data, isLoading: isFetching }
}
