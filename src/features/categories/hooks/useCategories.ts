// src/features/categories/hooks/useCategories.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '@/services/categoriesService'
import type { CreateCategoryPayload, UpdateCategoryPayload } from '@/types/models'

export const CATEGORY_KEYS = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
} as const

export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(),
    queryFn: () => categoriesService.list(),
    staleTime: 5 * 60 * 1000, // categories change rarely
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) => categoriesService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}
