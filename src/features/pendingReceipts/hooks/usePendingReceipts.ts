// src/features/pendingReceipts/hooks/usePendingReceipts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pendingReceiptsService } from '@/services/pendingReceiptsService'
import type { UpdatePendingReceiptPayload } from '@/types/models'

export const PENDING_RECEIPT_KEYS = {
  all: ['pendingReceipts'] as const,
  list: () => ['pendingReceipts', 'list'] as const,
} as const

export function usePendingReceipts() {
  return useQuery({
    queryKey: PENDING_RECEIPT_KEYS.list(),
    queryFn: () => pendingReceiptsService.list(),
  })
}

export function useCreatePendingReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => pendingReceiptsService.create(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_RECEIPT_KEYS.all })
    },
  })
}

export function useUpdatePendingReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePendingReceiptPayload }) =>
      pendingReceiptsService.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_RECEIPT_KEYS.all })
    },
  })
}

export function useDeletePendingReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pendingReceiptsService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_RECEIPT_KEYS.all })
    },
  })
}
