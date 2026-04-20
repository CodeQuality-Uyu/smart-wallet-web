// src/backend/msw/recurring.ts
// Recurring backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type {
  IRecurringBackend,
  RecurringExpense,
  CreateRecurringPayload,
  UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload,
  RecurringPaymentHistory,
  RecurringStatus,
} from '../types'

export const mswRecurringBackend: IRecurringBackend = {
  async list(): Promise<RecurringExpense[]> {
    const { data } = await httpClient.get<RecurringExpense[]>('/recurring')
    return data
  },

  async getById(id: string): Promise<RecurringExpense> {
    const { data } = await httpClient.get<RecurringExpense>(`/recurring/${id}`)
    return data
  },

  async create(payload: CreateRecurringPayload): Promise<RecurringExpense> {
    const { data } = await httpClient.post<RecurringExpense>('/recurring', payload)
    return data
  },

  async update(id: string, payload: UpdateRecurringPayload): Promise<RecurringExpense> {
    const { data } = await httpClient.patch<RecurringExpense>(`/recurring/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/recurring/${id}`)
  },

  async setStatus(id: string, status: RecurringStatus): Promise<RecurringExpense> {
    const { data } = await httpClient.patch<RecurringExpense>(`/recurring/${id}/status`, { status })
    return data
  },

  async confirmPayment(
    id: string,
    payload: ConfirmRecurringPaymentPayload,
  ): Promise<RecurringPaymentHistory> {
    const form = new FormData()
    form.append('amount', String(payload.amount))
    if (payload.receiptFile) {
      form.append('receipt', payload.receiptFile)
    }
    const { data } = await httpClient.post<RecurringPaymentHistory>(
      `/recurring/${id}/confirm-payment`,
      form,
    )
    return data
  },

  async uploadPaymentReceipt(
    recurringId: string,
    paymentId: string,
    file: File,
  ): Promise<{ receiptUrl: string }> {
    const form = new FormData()
    form.append('receipt', file)
    const { data } = await httpClient.post<{ receiptUrl: string }>(
      `/recurring/${recurringId}/payments/${paymentId}/receipt`,
      form,
    )
    return data
  },
}
