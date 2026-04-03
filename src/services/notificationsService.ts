// src/services/notificationsService.ts
// Thin delegator — all logic lives in the active backend implementation.

import { getNotificationsBackend } from '@/backend'
import type { Notification, NotificationPrefs } from '@/backend/types'

export type { Notification, NotificationPrefs }

export const notificationsService = {
  async list(): Promise<Notification[]> {
    return (await getNotificationsBackend()).list()
  },

  async markRead(id: string): Promise<Notification> {
    return (await getNotificationsBackend()).markRead(id)
  },

  async markAllRead(): Promise<void> {
    return (await getNotificationsBackend()).markAllRead()
  },

  async getPrefs(): Promise<NotificationPrefs> {
    return (await getNotificationsBackend()).getPrefs()
  },

  async setPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
    return (await getNotificationsBackend()).setPrefs(prefs)
  },
}
