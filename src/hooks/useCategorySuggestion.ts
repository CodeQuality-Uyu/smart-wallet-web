// src/hooks/useCategorySuggestion.ts

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { CategorySuggestionResult } from '@/services/geminiService'

const DEBOUNCE_MS = 1000
const MIN_CHARS = 4

export function useCategorySuggestion(
  name: string,
  queryKey: string,
  queryFn: () => Promise<CategorySuggestionResult>,
  enabled: boolean,
): {
  suggestion: CategorySuggestionResult | undefined
  isLoading: boolean
} {
  const [debouncedName, setDebouncedName] = useState('')

  useEffect(() => {
    if (name.length < MIN_CHARS) {
      setDebouncedName('')
      return
    }
    const timer = setTimeout(() => setDebouncedName(name), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [name])

  const { data, isFetching } = useQuery<CategorySuggestionResult>({
    queryKey: [queryKey, debouncedName],
    queryFn,
    enabled: enabled && debouncedName.length >= MIN_CHARS,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  return { suggestion: data, isLoading: isFetching }
}
