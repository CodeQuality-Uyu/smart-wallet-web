// src/services/reportAttachmentsService.ts

import { getReportAttachmentsBackend } from '@/backend'
import type { ReportAttachment, StatementImportRow } from '@/types/models'

export const reportAttachmentsService = {
  async list(yearMonth: string): Promise<ReportAttachment[]> {
    return (await getReportAttachmentsBackend()).list(yearMonth)
  },
  async getById(id: string): Promise<ReportAttachment | null> {
    return (await getReportAttachmentsBackend()).getById(id)
  },
  async upload(yearMonth: string, file: File, options?: { cardId?: string }): Promise<ReportAttachment> {
    return (await getReportAttachmentsBackend()).upload(yearMonth, file, options)
  },
  async savePendingLines(id: string, lines: StatementImportRow[]): Promise<ReportAttachment> {
    return (await getReportAttachmentsBackend()).savePendingLines(id, lines)
  },
  async markProcessed(id: string, data: { importedExpenseCount: number }): Promise<ReportAttachment> {
    return (await getReportAttachmentsBackend()).markProcessed(id, data)
  },
  async remove(id: string): Promise<void> {
    return (await getReportAttachmentsBackend()).remove(id)
  },
}
