// src/hooks/useReportAttachments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportAttachmentsService } from '@/services/reportAttachmentsService'

const KEYS = {
  list: (yearMonth: string) => ['reportAttachments', yearMonth] as const,
}

export function useReportAttachments(yearMonth: string) {
  return useQuery({
    queryKey: KEYS.list(yearMonth),
    queryFn: () => reportAttachmentsService.list(yearMonth),
    enabled: Boolean(yearMonth),
  })
}

export function useUploadReportAttachment(yearMonth: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, options }: { file: File; options?: { cardId?: string } }) =>
      reportAttachmentsService.upload(yearMonth, file, options),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list(yearMonth) }),
  })
}

export function useMarkAttachmentProcessed(yearMonth: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, importedExpenseCount }: { id: string; importedExpenseCount: number }) =>
      reportAttachmentsService.markProcessed(id, { importedExpenseCount }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list(yearMonth) }),
  })
}

export function useRemoveReportAttachment(yearMonth: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reportAttachmentsService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list(yearMonth) }),
  })
}
