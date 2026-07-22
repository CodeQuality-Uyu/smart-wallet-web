// src/backend/msw/dashboardWidgets.ts
// Dashboard widgets backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type {
  IDashboardWidgetsBackend,
  DashboardWidget,
  CreateDashboardWidgetPayload,
  UpdateDashboardWidgetPayload,
} from '../types'

export const mswDashboardWidgetsBackend: IDashboardWidgetsBackend = {
  async list(): Promise<DashboardWidget[]> {
    const { data } = await httpClient.get<DashboardWidget[]>('/dashboard-widgets')
    return data
  },

  async create(payload: CreateDashboardWidgetPayload): Promise<DashboardWidget> {
    const { data } = await httpClient.post<DashboardWidget>('/dashboard-widgets', payload)
    return data
  },

  async update(id: string, payload: UpdateDashboardWidgetPayload): Promise<DashboardWidget> {
    const { data } = await httpClient.patch<DashboardWidget>(`/dashboard-widgets/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/dashboard-widgets/${id}`)
  },
}
