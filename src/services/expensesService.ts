// src/services/expensesService.ts

import { httpClient } from '@/api/httpClient'
import type {
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload,
  TicketLine,
  PaginatedResponse,
  ExpenseFilters,
} from '@/types/models'

const BASE = '/expenses'

export const expensesService = {
  async list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    const { data } = await httpClient.get<PaginatedResponse<Expense>>(BASE, {
      params: filters,
    })
    return data
  },

  async getById(id: string): Promise<Expense> {
    const { data } = await httpClient.get<Expense>(`${BASE}/${id}`)
    return data
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const { data } = await httpClient.post<Expense>(BASE, payload)
    return data
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const { data } = await httpClient.patch<Expense>(`${BASE}/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${BASE}/${id}`)
  },

  async uploadReceipt(id: string, file: File): Promise<{ receiptUrl: string }> {
    const form = new FormData()
    form.append('receipt', file)
    const { data } = await httpClient.post<{ receiptUrl: string }>(
      `${BASE}/${id}/receipt`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async addTicketLine(expenseId: string, line: Omit<TicketLine, 'id'>): Promise<TicketLine> {
    const { data } = await httpClient.post<TicketLine>(
      `${BASE}/${expenseId}/ticket-lines`,
      line
    )
    return data
  },

  async removeTicketLine(expenseId: string, lineId: string): Promise<void> {
    await httpClient.delete(`${BASE}/${expenseId}/ticket-lines/${lineId}`)
  },
}
