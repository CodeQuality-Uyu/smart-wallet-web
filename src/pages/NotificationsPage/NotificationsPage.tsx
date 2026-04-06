// src/pages/NotificationsPage.tsx

import React from 'react'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPrefs,
  useSetNotificationPrefs,
} from '@/features/notifications/hooks/useNotifications'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { NotificationPrefs } from '@/types/models'
import styles from './NotificationsPage.module.css'

// ─── Relative timestamp ───────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs} hora${hrs !== 1 ? 's' : ''}`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

// ─── Toggle ───────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

function Toggle({ checked, onChange, label, description }: ToggleProps): React.ReactElement {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <p className={styles.toggleLabel}>{label}</p>
        {description && <p className={styles.toggleDesc}>{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={[styles.toggle, checked ? styles.toggleOn : styles.toggleOff].join(' ')}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}

// ─── Channel row ──────────────────────────────────────────

interface ChannelRowProps {
  icon: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ChannelRow({ icon, label, checked, onChange }: ChannelRowProps): React.ReactElement {
  return (
    <div className={styles.channelRow}>
      <div className={styles.channelLabel}>
        <span>{icon}</span>
        <span className={styles.toggleLabel}>{label}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={[styles.toggle, checked ? styles.toggleOn : styles.toggleOff].join(' ')}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────

export default function NotificationsPage(): React.ReactElement {
  const notificationsQuery = useNotifications()
  const prefsQuery = useNotificationPrefs()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const setPrefs = useSetNotificationPrefs()

  const notifications = notificationsQuery.data ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  function handlePrefChange<K extends keyof NotificationPrefs>(
    section: K,
    key: keyof NotificationPrefs[K],
    value: boolean
  ): void {
    if (!prefsQuery.data) return
    const updated: NotificationPrefs = {
      ...prefsQuery.data,
      [section]: {
        ...prefsQuery.data[section],
        [key]: value,
      },
    }
    setPrefs.mutate(updated)
  }

  function handleQuietHoursToggle(enabled: boolean): void {
    if (!prefsQuery.data) return
    setPrefs.mutate({
      ...prefsQuery.data,
      quietHours: { ...prefsQuery.data.quietHours, enabled },
    })
  }

  function handleQuietHoursTime(field: 'from' | 'to', value: string): void {
    if (!prefsQuery.data) return
    setPrefs.mutate({
      ...prefsQuery.data,
      quietHours: { ...prefsQuery.data.quietHours, [field]: value },
    })
  }

  const headerRight = (
    <div className={styles.headerActions}>
      {unreadCount > 0 && (
        <span className={styles.unreadBadge}>{unreadCount} sin leer</span>
      )}
      {unreadCount > 0 && (
        <button
          className={styles.markAllBtn}
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          Marcar todas leídas
        </button>
      )}
    </div>
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="Notificaciones"
        subtitle="Configurá qué alertas querés recibir y cómo"
        rightAction={headerRight}
      />

      <div className={styles.grid}>
        {/* ── Left column: recientes ── */}
        <section className={styles.recent}>
          <h3 className={styles.sectionTitle}>Recientes</h3>

          {notificationsQuery.isLoading && <LoadingSpinner size="sm" />}
          {notificationsQuery.isError && (
            <ErrorMessage
              message="No se pudieron cargar las notificaciones"
              onRetry={() => void notificationsQuery.refetch()}
            />
          )}

          {!notificationsQuery.isLoading && notifications.length === 0 && (
            <p className={styles.empty}>No tenés notificaciones</p>
          )}

          <div className={styles.notifList}>
            {notifications.map((n) => (
              <button
                key={n.id}
                className={[styles.notifItem, n.read ? styles.notifRead : styles.notifUnread].join(' ')}
                onClick={() => { if (!n.read) markRead.mutate(n.id) }}
                type="button"
              >
                {!n.read && <span className={styles.unreadDot} aria-hidden="true" />}
                <div className={styles.notifBody}>
                  <p className={styles.notifTitle}>{n.title}</p>
                  <p className={styles.notifDesc}>{n.body}</p>
                </div>
                <span className={styles.notifTime}>{relativeTime(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Right column: preferencias ── */}
        <section className={styles.prefs}>
          <h3 className={styles.sectionTitle}>Preferencias</h3>

          {prefsQuery.isLoading && <LoadingSpinner size="sm" />}
          {prefsQuery.isError && (
            <ErrorMessage message="No se pudieron cargar las preferencias" />
          )}

          {prefsQuery.data && (
            <>
              {/* Tipos de alerta */}
              <div className={styles.prefCard}>
                <p className={styles.prefCardTitle}>Tipos de alerta</p>
                <div className={styles.toggleList}>
                  <Toggle
                    checked={prefsQuery.data.alerts.expenses}
                    onChange={(v) => handlePrefChange('alerts', 'expenses', v)}
                    label="Gastos registrados"
                    description="Cada vez que se registra un gasto"
                  />
                  <Toggle
                    checked={prefsQuery.data.alerts.budgetLimit}
                    onChange={(v) => handlePrefChange('alerts', 'budgetLimit', v)}
                    label="Límite de presupuesto"
                    description="Al superar 75% y 90% del límite"
                  />
                  <Toggle
                    checked={prefsQuery.data.alerts.income}
                    onChange={(v) => handlePrefChange('alerts', 'income', v)}
                    label="Ingresos recibidos"
                    description="Cuando se acredita un ingreso"
                  />
                  <Toggle
                    checked={prefsQuery.data.alerts.weeklySummary}
                    onChange={(v) => handlePrefChange('alerts', 'weeklySummary', v)}
                    label="Resumen semanal"
                    description="Resumen cada lunes a las 9:00"
                  />
                  <Toggle
                    checked={prefsQuery.data.alerts.recurring}
                    onChange={(v) => handlePrefChange('alerts', 'recurring', v)}
                    label="Pagos recurrentes"
                    description="3 días antes del vencimiento"
                  />
                </div>
              </div>

              {/* Canal de entrega */}
              <div className={styles.prefCard}>
                <p className={styles.prefCardTitle}>Canal de entrega</p>
                <div className={styles.channelList}>
                  <ChannelRow
                    icon="📲"
                    label="Push (app)"
                    checked={prefsQuery.data.channels.push}
                    onChange={(v) => handlePrefChange('channels', 'push', v)}
                  />
                  <ChannelRow
                    icon="📧"
                    label="Email"
                    checked={prefsQuery.data.channels.email}
                    onChange={(v) => handlePrefChange('channels', 'email', v)}
                  />
                  <ChannelRow
                    icon="💬"
                    label="WhatsApp"
                    checked={prefsQuery.data.channels.whatsapp}
                    onChange={(v) => handlePrefChange('channels', 'whatsapp', v)}
                  />
                </div>
              </div>

              {/* Horario silencioso */}
              <div className={styles.prefCardQuiet}>
                <div className={styles.quietHeader}>
                  <div className={styles.quietTitle}>
                    <span>🌙</span>
                    <p className={styles.prefCardTitle}>Horario silencioso</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={prefsQuery.data.quietHours.enabled}
                    className={[
                      styles.toggle,
                      prefsQuery.data.quietHours.enabled ? styles.toggleOn : styles.toggleOff,
                    ].join(' ')}
                    onClick={() => handleQuietHoursToggle(!prefsQuery.data!.quietHours.enabled)}
                    type="button"
                  >
                    <span className={styles.knob} />
                  </button>
                </div>
                {prefsQuery.data.quietHours.enabled && (
                  <div className={styles.quietTimes}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={prefsQuery.data.quietHours.from}
                      onChange={(e) => handleQuietHoursTime('from', e.target.value)}
                    />
                    <span className={styles.quietSep}>a</span>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={prefsQuery.data.quietHours.to}
                      onChange={(e) => handleQuietHoursTime('to', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
