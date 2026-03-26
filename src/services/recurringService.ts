// src/services/recurringService.ts

import { httpClient } from '@/api/httpClient'
import type {
  RecurringExpense,
  CreateRecurringPayload,
  UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload,
  RecurringPaymentHistory,
} from '@/types/models'
import { RecurringStatus } from '@/types/enums'

const BASE = '/recurring'

export const recurringService = {
  async list(): Promise<RecurringExpense[]> {
    const { data } = await httpClient.get<RecurringExpense[]>(BASE)
    return data
  },

  async getById(id: string): Promise<RecurringExpense> {
    const { data } = await httpClient.get<RecurringExpense>(`${BASE}/${id}`)
    return data
  },

  async create(payload: CreateRecurringPayload): Promise<RecurringExpense> {
    const { data } = await httpClient.post<RecurringExpense>(BASE, payload)
    return data
  },

  async update(id: string, payload: UpdateRecurringPayload): Promise<RecurringExpense> {
    const { data } = await httpClient.patch<RecurringExpense>(`${BASE}/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${BASE}/${id}`)
  },

  async setStatus(id: string, status: RecurringStatus): Promise<RecurringExpense> {
    const { data } = await httpClient.patch<RecurringExpense>(`${BASE}/${id}/status`, {
      status,
    })
    return data
  },

  async confirmPayment(
    id: string,
    payload: ConfirmRecurringPaymentPayload
  ): Promise<RecurringPaymentHistory> {
    const form = new FormData()
    form.append('amount', String(payload.amount))
    if (payload.receiptFile) {
      form.append('receipt', payload.receiptFile)
    }
    const { data } = await httpClient.post<RecurringPaymentHistory>(
      `${BASE}/${id}/confirm-payment`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },
}
