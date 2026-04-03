// src/backend/msw/notifications.ts
import { httpClient } from '@/api/httpClient'
import type { INotificationsBackend } from '../types'
import type { Notification, NotificationPrefs } from '@/types/models'

export const mswNotificationsBackend: INotificationsBackend = {
  async list(): Promise<Notification[]> {
    const { data } = await httpClient.get<Notification[]>('/notifications')
    return data
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await httpClient.patch<Notification>(`/notifications/${id}/read`, {})
    return data
  },

  async markAllRead(): Promise<void> {
    await httpClient.post('/notifications/read-all', {})
  },

  async getPrefs(): Promise<NotificationPrefs> {
    const { data } = await httpClient.get<NotificationPrefs>('/notifications/prefs')
    return data
  },

  async setPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
    const { data } = await httpClient.put<NotificationPrefs>('/notifications/prefs', prefs)
    return data
  },
}
