// src/services/reportAttachmentsService.ts

import { getReportAttachmentsBackend } from '@/backend'
import type { ReportAttachment } from '@/types/models'

export const reportAttachmentsService = {
  async list(yearMonth: string): Promise<ReportAttachment[]> {
    return (await getReportAttachmentsBackend()).list(yearMonth)
  },
  async upload(yearMonth: string, file: File): Promise<ReportAttachment> {
    return (await getReportAttachmentsBackend()).upload(yearMonth, file)
  },
  async remove(id: string): Promise<void> {
    return (await getReportAttachmentsBackend()).remove(id)
  },
}
