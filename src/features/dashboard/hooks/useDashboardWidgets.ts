// src/features/dashboard/hooks/useDashboardWidgets.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardWidgetsService } from '@/services/dashboardWidgetsService'
import type {
  DashboardWidget,
  CreateDashboardWidgetPayload,
  UpdateDashboardWidgetPayload,
} from '@/types/models'

export const DASHBOARD_WIDGET_KEYS = {
  all: ['dashboardWidgets'] as const,
  list: () => ['dashboardWidgets', 'list'] as const,
} as const

export function useDashboardWidgets() {
  return useQuery({
    queryKey: DASHBOARD_WIDGET_KEYS.list(),
    queryFn: () => dashboardWidgetsService.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateDashboardWidget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDashboardWidgetPayload) => dashboardWidgetsService.create(payload),
    onSuccess: (widget) => {
      qc.setQueryData<DashboardWidget[]>(DASHBOARD_WIDGET_KEYS.list(), (prev) => [
        ...(prev ?? []),
        widget,
      ])
    },
  })
}

export function useUpdateDashboardWidget(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateDashboardWidgetPayload) => dashboardWidgetsService.update(id, payload),
    onSuccess: (widget) => {
      qc.setQueryData<DashboardWidget[]>(DASHBOARD_WIDGET_KEYS.list(), (prev) =>
        (prev ?? []).map((w) => (w.id === widget.id ? widget : w))
      )
    },
  })
}

export function useDeleteDashboardWidget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dashboardWidgetsService.remove(id),
    onSuccess: (_res, id) => {
      qc.setQueryData<DashboardWidget[]>(DASHBOARD_WIDGET_KEYS.list(), (prev) =>
        (prev ?? []).filter((w) => w.id !== id)
      )
    },
  })
}

/** Persiste nuevas posiciones para reordenar. Actualiza la cache optimistamente. */
export function useReorderDashboardWidgets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      await Promise.all(updates.map((u) => dashboardWidgetsService.update(u.id, { position: u.position })))
      return updates
    },
    onMutate: (updates) => {
      const posMap = new Map(updates.map((u) => [u.id, u.position]))
      qc.setQueryData<DashboardWidget[]>(DASHBOARD_WIDGET_KEYS.list(), (prev) =>
        prev
          ? [...prev]
              .map((w) => (posMap.has(w.id) ? { ...w, position: posMap.get(w.id)! } : w))
              .sort((a, b) => a.position - b.position)
          : prev,
      )
    },
  })
}
