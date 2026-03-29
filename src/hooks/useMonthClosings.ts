// src/hooks/useMonthClosings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { monthClosingsService } from '@/services/monthClosingsService'
import type { CreateMonthClosingPayload } from '@/types/models'

export const CLOSING_KEYS = {
  all: ['monthClosings'] as const,
  list: () => ['monthClosings', 'list'] as const,
  detail: (id: string) => ['monthClosings', 'detail', id] as const,
} as const

export function useMonthClosings() {
  return useQuery({
    queryKey: CLOSING_KEYS.list(),
    queryFn: () => monthClosingsService.list(),
  })
}

export function useMonthClosing(id: string) {
  return useQuery({
    queryKey: CLOSING_KEYS.detail(id),
    queryFn: () => monthClosingsService.getById(id),
    enabled: Boolean(id),
  })
}

export function useCreateMonthClosing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMonthClosingPayload) => monthClosingsService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLOSING_KEYS.all }),
  })
}
