// src/backend/msw/pendingReceipts.ts

import { httpClient } from '@/api/httpClient'
import type { IPendingReceiptsBackend, PendingReceipt, UpdatePendingReceiptPayload } from '../types'

export const mswPendingReceiptsBackend: IPendingReceiptsBackend = {
  async list(): Promise<PendingReceipt[]> {
    const { data } = await httpClient.get<PendingReceipt[]>('/pending-receipts')
    return data
  },

  async create(file: File): Promise<PendingReceipt> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await httpClient.post<PendingReceipt>('/pending-receipts', form)
    return data
  },

  async update(id: string, payload: UpdatePendingReceiptPayload): Promise<PendingReceipt> {
    const { data } = await httpClient.patch<PendingReceipt>(`/pending-receipts/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/pending-receipts/${id}`)
  },
}
