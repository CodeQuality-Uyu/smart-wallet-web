// src/services/expensesService.ts

import { getExpensesBackend } from '@/backend'
import type {
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload,
  TicketLine,
  PaginatedResponse,
  ExpenseFilters,
} from '@/types/models'

export const expensesService = {
  async list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    return (await getExpensesBackend()).list(filters)
  },

  async getById(id: string): Promise<Expense> {
    return (await getExpensesBackend()).getById(id)
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    return (await getExpensesBackend()).create(payload)
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    return (await getExpensesBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getExpensesBackend()).remove(id)
  },

  async uploadReceipt(id: string, file: File): Promise<{ receiptUrl: string }> {
    return (await getExpensesBackend()).uploadReceipt(id, file)
  },

  async addTicketLine(expenseId: string, line: Omit<TicketLine, 'id'>): Promise<TicketLine> {
    return (await getExpensesBackend()).addTicketLine(expenseId, line)
  },

  async removeTicketLine(expenseId: string, lineId: string): Promise<void> {
    return (await getExpensesBackend()).removeTicketLine(expenseId, lineId)
  },
}
