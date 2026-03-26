// src/features/recurring/hooks/useRecurring.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recurringService } from '@/services/recurringService'
import type {
  CreateRecurringPayload,
  UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload,
} from '@/types/models'
import { RecurringStatus } from '@/types/enums'

export const RECURRING_KEYS = {
  all: ['recurring'] as const,
  list: () => ['recurring', 'list'] as const,
  detail: (id: string) => ['recurring', 'detail', id] as const,
} as const

export function useRecurringList() {
  return useQuery({
    queryKey: RECURRING_KEYS.list(),
    queryFn: () => recurringService.list(),
  })
}

export function useRecurring(id: string) {
  return useQuery({
    queryKey: RECURRING_KEYS.detail(id),
    queryFn: () => recurringService.getById(id),
    enabled: Boolean(id),
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRecurringPayload) => recurringService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECURRING_KEYS.all }),
  })
}

export function useUpdateRecurring(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateRecurringPayload) => recurringService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECURRING_KEYS.all }),
  })
}

export function useToggleRecurringStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: RecurringStatus) => recurringService.setStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECURRING_KEYS.all }),
  })
}

export function useConfirmRecurringPayment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConfirmRecurringPaymentPayload) =>
      recurringService.confirmPayment(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECURRING_KEYS.all }),
  })
}
