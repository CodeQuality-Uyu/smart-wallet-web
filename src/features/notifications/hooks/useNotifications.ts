// src/features/notifications/hooks/useNotifications.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/services/notificationsService'
import type { Notification, NotificationPrefs } from '@/types/models'

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  prefs: () => ['notifications', 'prefs'] as const,
} as const

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(),
    queryFn: () => notificationsService.list(),
    staleTime: 60 * 1000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: (updated) => {
      qc.setQueryData<Notification[]>(NOTIFICATION_KEYS.list(), (prev) =>
        prev?.map((n) => (n.id === updated.id ? updated : n)) ?? []
      )
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.setQueryData<Notification[]>(NOTIFICATION_KEYS.list(), (prev) =>
        prev?.map((n) => ({ ...n, read: true })) ?? []
      )
    },
  })
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.prefs(),
    queryFn: () => notificationsService.getPrefs(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetNotificationPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) => notificationsService.setPrefs(prefs),
    onSuccess: (updated) => {
      qc.setQueryData<NotificationPrefs>(NOTIFICATION_KEYS.prefs(), updated)
    },
  })
}
