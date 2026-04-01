// src/features/products/hooks/useProducts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsService } from '@/services/productsService'
import type { Product, CreateProductPayload, UpdateProductPayload } from '@/types/models'
import type { ProductsFilter } from '@/backend/types'

export const PRODUCT_KEYS = {
  all:     ['products'] as const,
  list:    (filters?: ProductsFilter) => ['products', 'list', filters] as const,
  detail:  (id: string) => ['products', 'detail', id] as const,
} as const

export function useProducts(filters?: ProductsFilter) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(filters),
    queryFn: () => productsService.list(filters),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => productsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsService.create(payload),
    onSuccess: (created) => {
      // Update all cached lists regardless of active filters
      qc.setQueriesData<Product[]>({ queryKey: ['products', 'list'] }, (prev) =>
        [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
      )
    },
  })
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProductPayload) => productsService.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueriesData<Product[]>({ queryKey: ['products', 'list'] }, (prev) =>
        (prev ?? []).map((p) => (p.id === id ? updated : p)),
      )
      qc.setQueryData<Product>(PRODUCT_KEYS.detail(id), updated)
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Product[]>({ queryKey: ['products', 'list'] }, (prev) =>
        (prev ?? []).filter((p) => p.id !== id),
      )
      qc.removeQueries({ queryKey: PRODUCT_KEYS.detail(id) })
    },
  })
}
