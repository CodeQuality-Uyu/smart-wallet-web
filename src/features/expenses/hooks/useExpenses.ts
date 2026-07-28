// src/features/expenses/hooks/useExpenses.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesService } from '@/services/expensesService'
import type {
  CreateExpensePayload,
  UpdateExpensePayload,
  ExpenseFilters,
  TicketLine,
} from '@/types/models'

export const EXPENSE_KEYS = {
  all: ['expenses'] as const,
  list: (filters?: ExpenseFilters) => ['expenses', 'list', filters] as const,
  detail: (id: string) => ['expenses', 'detail', id] as const,
} as const

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: EXPENSE_KEYS.list(filters),
    queryFn: () => expensesService.list(filters),
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: EXPENSE_KEYS.detail(id),
    queryFn: () => expensesService.getById(id),
    enabled: Boolean(id),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => expensesService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useCreateExpenseBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payloads: CreateExpensePayload[]) => expensesService.createBatch(payloads),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

/** Actualiza todas las cuotas de una serie. No propaga la fecha (cada cuota conserva su mes). */
export function useUpdateInstallmentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, payload }: { groupId: string; payload: UpdateExpensePayload }) => {
      const group = await expensesService.listInstallmentGroup(groupId)
      const shared: UpdateExpensePayload = { ...payload }
      delete shared.date
      await Promise.all(group.map((e) => expensesService.update(e.id, shared)))
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

/** Elimina todas las cuotas de una serie. */
export function useDeleteInstallmentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const group = await expensesService.listInstallmentGroup(groupId)
      await Promise.all(group.map((e) => expensesService.remove(e.id)))
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateExpensePayload) => expensesService.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useDuplicateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.duplicate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useAddTicketLine(expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (line: Omit<TicketLine, 'id'>) =>
      expensesService.addTicketLine(expenseId, line),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.detail(expenseId) })
    },
  })
}

export function useRemoveTicketLine(expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) => expensesService.removeTicketLine(expenseId, lineId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.detail(expenseId) })
    },
  })
}

export function useUploadExpenseReceipt(expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => expensesService.uploadReceipt(expenseId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_KEYS.detail(expenseId) })
    },
  })
}
