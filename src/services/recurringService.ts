// src/services/recurringService.ts

import { getRecurringBackend } from '@/backend'
import type {
  RecurringExpense,
  CreateRecurringPayload,
  UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload,
  RecurringPaymentHistory,
} from '@/types/models'
import { RecurringStatus } from '@/types/enums'

export const recurringService = {
  async list(): Promise<RecurringExpense[]> {
    return (await getRecurringBackend()).list()
  },

  async getById(id: string): Promise<RecurringExpense> {
    return (await getRecurringBackend()).getById(id)
  },

  async create(payload: CreateRecurringPayload): Promise<RecurringExpense> {
    return (await getRecurringBackend()).create(payload)
  },

  async update(id: string, payload: UpdateRecurringPayload): Promise<RecurringExpense> {
    return (await getRecurringBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getRecurringBackend()).remove(id)
  },

  async setStatus(id: string, status: RecurringStatus): Promise<RecurringExpense> {
    return (await getRecurringBackend()).setStatus(id, status)
  },

  async confirmPayment(
    id: string,
    payload: ConfirmRecurringPaymentPayload,
  ): Promise<RecurringPaymentHistory> {
    return (await getRecurringBackend()).confirmPayment(id, payload)
  },
}
