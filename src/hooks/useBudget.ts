// src/hooks/useBudget.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetService } from '@/services/budgetService'
import type { BudgetSettings } from '@/types/models'

export const BUDGET_KEY = ['budget'] as const

export function useBudget() {
  return useQuery({
    queryKey: BUDGET_KEY,
    queryFn: () => budgetService.get(),
  })
}

export function useSetBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: BudgetSettings) => budgetService.set(settings),
    onSuccess: () => void qc.invalidateQueries({ queryKey: BUDGET_KEY }),
  })
}
