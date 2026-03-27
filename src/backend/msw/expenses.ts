// src/backend/msw/expenses.ts
// Expenses backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type {
  IExpensesBackend,
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload,
  TicketLine,
  PaginatedResponse,
  ExpenseFilters,
} from '../types'

export const mswExpensesBackend: IExpensesBackend = {
  async list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    const { data } = await httpClient.get<PaginatedResponse<Expense>>('/expenses', {
      params: filters,
    })
    return data
  },

  async getById(id: string): Promise<Expense> {
    const { data } = await httpClient.get<Expense>(`/expenses/${id}`)
    return data
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const { data } = await httpClient.post<Expense>('/expenses', payload)
    return data
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const { data } = await httpClient.patch<Expense>(`/expenses/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/expenses/${id}`)
  },

  async uploadReceipt(id: string, file: File): Promise<{ receiptUrl: string }> {
    const form = new FormData()
    form.append('receipt', file)
    const { data } = await httpClient.post<{ receiptUrl: string }>(
      `/expenses/${id}/receipt`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  async addTicketLine(expenseId: string, line: Omit<TicketLine, 'id'>): Promise<TicketLine> {
    const { data } = await httpClient.post<TicketLine>(
      `/expenses/${expenseId}/ticket-lines`,
      line,
    )
    return data
  },

  async removeTicketLine(expenseId: string, lineId: string): Promise<void> {
    await httpClient.delete(`/expenses/${expenseId}/ticket-lines/${lineId}`)
  },
}
