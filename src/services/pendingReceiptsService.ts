// src/services/pendingReceiptsService.ts

import { getPendingReceiptsBackend } from '@/backend'
import type { PendingReceipt, UpdatePendingReceiptPayload } from '@/types/models'

export const pendingReceiptsService = {
  async list(): Promise<PendingReceipt[]> {
    return (await getPendingReceiptsBackend()).list()
  },

  async create(file: File): Promise<PendingReceipt> {
    return (await getPendingReceiptsBackend()).create(file)
  },

  async update(id: string, payload: UpdatePendingReceiptPayload): Promise<PendingReceipt> {
    return (await getPendingReceiptsBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getPendingReceiptsBackend()).remove(id)
  },
}
