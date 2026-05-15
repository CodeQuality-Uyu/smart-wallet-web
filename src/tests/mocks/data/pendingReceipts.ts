// src/tests/mocks/data/pendingReceipts.ts

import { ReceiptStatus, Currency } from '@/types/enums'
import type { PendingReceipt } from '@/types/models'

export const mockPendingReceipts: PendingReceipt[] = [
  {
    id: 'receipt-1',
    imageUrl: 'https://via.placeholder.com/400x600?text=Comprobante+1',
    status: ReceiptStatus.Pending,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'receipt-2',
    imageUrl: 'https://via.placeholder.com/400x600?text=Comprobante+2',
    status: ReceiptStatus.Pending,
    extractedData: {
      description: 'Supermercado Devoto',
      amount: 1250,
      currency: Currency.UYU,
      date: new Date().toISOString().split('T')[0],
      confidence: 'high',
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
