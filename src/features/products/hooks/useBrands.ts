// src/features/products/hooks/useBrands.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brandsService } from '@/services/brandsService'
import type { Brand, CreateBrandPayload, UpdateBrandPayload } from '@/types/models'

export const BRAND_KEYS = {
  all:    ['brands'] as const,
  list:   () => ['brands', 'list'] as const,
  search: (q: string) => ['brands', 'search', q] as const,
} as const

export function useBrands() {
  return useQuery({
    queryKey: BRAND_KEYS.list(),
    queryFn: () => brandsService.list(),
    staleTime: 5 * 60_000,
  })
}

export function useSearchBrands(query: string) {
  return useQuery({
    queryKey: BRAND_KEYS.search(query),
    queryFn: () => brandsService.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => brandsService.create(payload),
    onSuccess: (created) => {
      qc.setQueryData<Brand[]>(BRAND_KEYS.list(), (prev) =>
        [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
      )
      // Invalidate search cache so new brand appears in autocomplete
      void qc.invalidateQueries({ queryKey: ['brands', 'search'] })
    },
  })
}

export function useUpdateBrand(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBrandPayload) => brandsService.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<Brand[]>(BRAND_KEYS.list(), (prev) =>
        (prev ?? []).map((b) => (b.id === id ? updated : b)),
      )
      void qc.invalidateQueries({ queryKey: ['brands', 'search'] })
    },
  })
}

export function useDeleteBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => brandsService.remove(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<Brand[]>(BRAND_KEYS.list(), (prev) =>
        (prev ?? []).filter((b) => b.id !== id),
      )
      void qc.invalidateQueries({ queryKey: ['brands', 'search'] })
    },
  })
}
