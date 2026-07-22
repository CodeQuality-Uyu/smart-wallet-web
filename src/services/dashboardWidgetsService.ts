// src/services/dashboardWidgetsService.ts

import { getDashboardWidgetsBackend } from '@/backend'
import type {
  DashboardWidget,
  CreateDashboardWidgetPayload,
  UpdateDashboardWidgetPayload,
} from '@/types/models'

export const dashboardWidgetsService = {
  async list(): Promise<DashboardWidget[]> {
    return (await getDashboardWidgetsBackend()).list()
  },

  async create(payload: CreateDashboardWidgetPayload): Promise<DashboardWidget> {
    return (await getDashboardWidgetsBackend()).create(payload)
  },

  async update(id: string, payload: UpdateDashboardWidgetPayload): Promise<DashboardWidget> {
    return (await getDashboardWidgetsBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getDashboardWidgetsBackend()).remove(id)
  },
}
