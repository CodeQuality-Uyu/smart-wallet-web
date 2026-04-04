// src/tests/mocks/data/notifications.ts

import { NotificationType } from '@/types/enums'
import type { Notification, NotificationPrefs } from '@/types/models'

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: '⚠️ Presupuesto de Comida al 91%',
    body: 'Gastaste $18,200 de $20,000 este mes',
    type: NotificationType.BudgetAlert,
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    title: '💰 Ingreso recibido',
    body: 'Salario acreditado: $85,000 UYU en BROU',
    type: NotificationType.Income,
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    title: '🔄 Pago recurrente próximo',
    body: 'Netflix $549 UYU se cobra en 3 días',
    type: NotificationType.Recurring,
    read: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    title: '💳 Gasto registrado',
    body: 'Supermercado Disco — $2,350 UYU (Débito)',
    type: NotificationType.Expense,
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-5',
    title: '📊 Resumen semanal listo',
    body: 'Gastaste un 12% menos que la semana pasada',
    type: NotificationType.WeeklySummary,
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-6',
    title: '⚠️ Presupuesto de Transporte al 78%',
    body: 'Gastaste $7,800 de $10,000 este mes',
    type: NotificationType.BudgetAlert,
    read: true,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const mockNotificationPrefs: NotificationPrefs = {
  alerts: {
    expenses: true,
    budgetLimit: true,
    income: true,
    weeklySummary: false,
    recurring: true,
  },
  channels: {
    push: true,
    email: false,
    whatsapp: true,
  },
  quietHours: {
    enabled: true,
    from: '22:00',
    to: '08:00',
  },
}
