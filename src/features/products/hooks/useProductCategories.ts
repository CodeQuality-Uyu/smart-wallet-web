// src/features/products/hooks/useProductCategories.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productCategoriesService } from '@/services/productCategoriesService'
import type { ProductCategory, CreateProductCategoryPayload, UpdateProductCategoryPayload } from '@/types/models'

export const PRODUCT_CATEGORY_KEYS = {
  all:  ['productCategories'] as const,
  list: () => ['productCategories', 'list'] as const,
} as const

export function useProductCategories() {
  return useQuery({
    queryKey: PRODUCT_CATEGORY_KEYS.list(),
    queryFn: () => productCategoriesService.list(),
    staleTime: 5 * 60_000,
  })
}

export function useCreateProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductCategoryPayload) => productCategoriesService.create(payload),
    onSuccess: (created) => {
      qc.setQueryData<ProductCategory[]>(PRODUCT_CATEGORY_KEYS.list(), (prev) =>
        [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
      )
    },
  })
}

export function useUpdateProductCategory(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProductCategoryPayload) => productCategoriesService.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<ProductCategory[]>(PRODUCT_CATEGORY_KEYS.list(), (prev) =>
        (prev ?? []).map((c) => (c.id === id ? updated : c)),
      )
    },
  })
}

export function useDeleteProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productCategoriesService.remove(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<ProductCategory[]>(PRODUCT_CATEGORY_KEYS.list(), (prev) =>
        (prev ?? []).filter((c) => c.id !== id),
      )
    },
  })
}
