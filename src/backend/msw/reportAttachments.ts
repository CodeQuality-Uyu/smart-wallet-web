// src/backend/msw/reportAttachments.ts

import { httpClient } from '@/api/httpClient'
import type { IReportAttachmentsBackend, ReportAttachment } from '../types'

export const mswReportAttachmentsBackend: IReportAttachmentsBackend = {
  async list(yearMonth: string): Promise<ReportAttachment[]> {
    const { data } = await httpClient.get<ReportAttachment[]>('/report-attachments', {
      params: { yearMonth },
    })
    return data
  },

  async upload(yearMonth: string, file: File, options?: { cardId?: string }): Promise<ReportAttachment> {
    const form = new FormData()
    form.append('yearMonth', yearMonth)
    form.append('file', file)
    if (options?.cardId) form.append('cardId', options.cardId)
    const { data } = await httpClient.post<ReportAttachment>('/report-attachments', form)
    return data
  },

  async markProcessed(id: string, data: { importedExpenseCount: number }): Promise<ReportAttachment> {
    const { data: result } = await httpClient.patch<ReportAttachment>(`/report-attachments/${id}/mark-processed`, data)
    return result
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/report-attachments/${id}`)
  },
}
