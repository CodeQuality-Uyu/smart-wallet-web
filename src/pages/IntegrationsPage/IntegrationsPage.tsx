// src/pages/IntegrationsPage/IntegrationsPage.tsx

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import {
  useGmailIntegration,
  useSetGmailIntegration,
  suggestedWindowDays,
  DEFAULT_WINDOW_DAYS,
  GMAIL_QUEUE_KEY,
} from '@/features/integrations/hooks/useGmailIntegration'
import {
  requestGmailAccess,
  clearGmailAccess,
  hasValidGmailToken,
} from '@/features/integrations/gmailAuth'
import { gmailService } from '@/services/gmailService'
import { integrationsService } from '@/services/integrationsService'
import { syncGmail } from '@/services/gmailSyncService'
import { GmailImportModal } from '@/features/integrations/components/GmailImportModal'
import type { GmailIntegration, GmailLabel } from '@/types/models'
import styles from './IntegrationsPage.module.css'

// ─── Catálogo de integraciones ────────────────────────────

type IntegrationStatus = 'available' | 'soon'

interface IntegrationMeta {
  id: 'gmail' | 'sms'
  icon: string
  name: string
  description: string
  status: IntegrationStatus
}

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: 'gmail',
    icon: '📧',
    name: 'Gmail',
    description: 'Importá gastos desde los avisos de compra de tu banco o tarjeta',
    status: 'available',
  },
  {
    id: 'sms',
    icon: '📱',
    name: 'SMS',
    description: 'Detectá compras desde los mensajes de tu banco',
    status: 'soon',
  },
]

function relativeDate(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

// ─── Panel de configuración de Gmail ──────────────────────

function GmailPanel(): React.ReactElement {
  const qc = useQueryClient()
  const query = useGmailIntegration()
  const setConfig = useSetGmailIntegration()
  const [senderDraft, setSenderDraft] = useState('')
  const [labelDraft, setLabelDraft] = useState('')
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[] | null>(null)
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [labelsError, setLabelsError] = useState<string | null>(null)
  const [syncWindow, setSyncWindow] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [tokenActive, setTokenActive] = useState(hasValidGmailToken())

  const config = query.data

  if (query.isLoading || !config) {
    return (
      <div className={styles.panel}>
        {query.isError ? (
          <ErrorMessage message="No se pudo cargar la integración" onRetry={() => void query.refetch()} />
        ) : (
          <LoadingSpinner size="sm" />
        )}
      </div>
    )
  }

  function patch(next: Partial<GmailIntegration>): void {
    setConfig.mutate(next)
  }

  async function handleConnect(): Promise<void> {
    setAuthError(null)
    setConnecting(true)
    try {
      await requestGmailAccess()
      setTokenActive(true)
      patch({ linked: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'No se pudo conectar con Gmail.')
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect(): void {
    clearGmailAccess()
    setTokenActive(false)
    setAuthError(null)
    patch({ linked: false })
  }

  function handleToggleConnection(): void {
    // Solo "desconecta" (desvincula) si está plenamente conectado (con token).
    // Si está vinculado pero sin token de sesión, el botón reconecta.
    if (config!.linked && hasValidGmailToken()) handleDisconnect()
    else void handleConnect()
  }

  function handleAddSender(): void {
    const value = senderDraft.trim().toLowerCase()
    if (!value || config!.senders.includes(value)) {
      setSenderDraft('')
      return
    }
    patch({ senders: [...config!.senders, value] })
    setSenderDraft('')
  }

  function handleRemoveSender(sender: string): void {
    patch({ senders: config!.senders.filter((s) => s !== sender) })
  }

  function addLabelValue(value: string): void {
    const clean = value.trim()
    if (!clean || config!.labels.includes(clean)) return
    patch({ labels: [...config!.labels, clean] })
  }

  function handleAddLabel(): void {
    addLabelValue(labelDraft)
    setLabelDraft('')
  }

  function handleRemoveLabel(label: string): void {
    patch({ labels: config!.labels.filter((l) => l !== label) })
  }

  async function handleLoadLabels(): Promise<void> {
    setLabelsError(null)
    setLoadingLabels(true)
    try {
      setAvailableLabels(await gmailService.listLabels())
    } catch (err) {
      setLabelsError(err instanceof Error ? err.message : 'No se pudieron cargar las etiquetas.')
    } finally {
      setLoadingLabels(false)
    }
  }

  const suggested = suggestedWindowDays(config)
  const effectiveSyncWindow = syncWindow ?? suggested
  const hasSources = config.senders.length > 0 || config.labels.length > 0
  const canSync = config.linked && tokenActive && hasSources

  async function handleSync(): Promise<void> {
    setSyncMsg(null)
    setReviewOpen(true) // abre el modal en estado "Descargando emails…"
    setSyncing(true)
    try {
      const queueData = await integrationsService.getGmailQueue()
      const result = await syncGmail({
        senders: config!.senders,
        labels: config!.labels,
        windowDays: effectiveSyncWindow,
        seenIds: queueData.seenIds,
        now: new Date().toISOString(),
      })
      qc.setQueryData(GMAIL_QUEUE_KEY, result.queue)
      patch({ lastSyncAt: new Date().toISOString() })
      setSyncMsg(
        result.fresh === 0
          ? 'No había mails nuevos.'
          : `${result.added} gasto${result.added !== 1 ? 's' : ''} para revisar` +
              ` (de ${result.fresh} mail${result.fresh !== 1 ? 's' : ''} nuevo${result.fresh !== 1 ? 's' : ''}).`,
      )
    } catch (err) {
      setReviewOpen(false) // cierra el modal de procesamiento ante un error
      setSyncMsg(err instanceof Error ? err.message : 'Error al sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={styles.panel}>

      {/* ── Conexión ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Conexión</h3>
          <span
            className={[
              styles.statusPill,
              !config.linked ? styles.statusOff : tokenActive ? styles.statusOn : styles.statusWarn,
            ].join(' ')}
          >
            {!config.linked ? '○ Sin conectar' : tokenActive ? '● Conectado' : '● Reconectá'}
          </span>
        </div>
        <p className={styles.cardHint}>
          SmartWallet solo lee los mails de los remitentes que configures abajo. Nunca accede al
          resto de tu bandeja.
        </p>
        <button
          className={config.linked && tokenActive ? styles.btnSecondary : styles.btnPrimary}
          onClick={handleToggleConnection}
          disabled={connecting}
          type="button"
        >
          {connecting
            ? 'Conectando…'
            : !config.linked
              ? 'Conectar con Google'
              : tokenActive
                ? 'Desconectar'
                : 'Reconectar'}
        </button>
        {authError && <p className={styles.errorText}>{authError}</p>}
        {config.linked && !tokenActive && !connecting && (
          <p className={styles.syncHint}>
            Vinculaste tu cuenta, pero el permiso de esta sesión se perdió (pasa al recargar la
            página). Reconectá para poder sincronizar.
          </p>
        )}
      </section>

      {/* ── Remitentes ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Remitentes</h3>
        </div>
        <p className={styles.cardHint}>
          Direcciones desde las que llegan tus avisos de compra (banco, tarjeta).
        </p>

        <div className={styles.senderInputRow}>
          <input
            className={styles.input}
            type="email"
            placeholder="notificaciones@tubanco.com.uy"
            value={senderDraft}
            onChange={(e) => setSenderDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddSender()
              }
            }}
          />
          <button className={styles.btnPrimary} onClick={handleAddSender} type="button">
            Agregar
          </button>
        </div>

        {config.senders.length === 0 ? (
          <p className={styles.empty}>Todavía no agregaste remitentes.</p>
        ) : (
          <ul className={styles.senderList}>
            {config.senders.map((sender) => (
              <li key={sender} className={styles.senderChip}>
                <span className={styles.senderEmail}>{sender}</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => handleRemoveSender(sender)}
                  aria-label={`Quitar ${sender}`}
                  type="button"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Etiquetas ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Etiquetas</h3>
        </div>
        <p className={styles.cardHint}>
          Etiquetas de Gmail donde también buscar. Se combinan con los remitentes (un mail sirve
          si viene de un remitente <em>o</em> tiene una etiqueta).
        </p>

        <div className={styles.senderInputRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Banco"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddLabel()
              }
            }}
          />
          <button className={styles.btnPrimary} onClick={handleAddLabel} type="button">
            Agregar
          </button>
        </div>

        {config.labels.length > 0 && (
          <ul className={styles.senderList}>
            {config.labels.map((label) => (
              <li key={label} className={styles.senderChip}>
                <span className={styles.senderEmail}>🏷️ {label}</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => handleRemoveLabel(label)}
                  aria-label={`Quitar ${label}`}
                  type="button"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Selector de etiquetas reales de la cuenta */}
        <button
          className={styles.btnSecondaryNeutral}
          onClick={() => void handleLoadLabels()}
          disabled={!tokenActive || loadingLabels}
          type="button"
        >
          {loadingLabels ? 'Cargando…' : 'Ver mis etiquetas de Gmail'}
        </button>
        {!tokenActive && (
          <p className={styles.syncHint}>Conectá tu cuenta para elegir entre tus etiquetas.</p>
        )}
        {labelsError && <p className={styles.errorText}>{labelsError}</p>}
        {availableLabels && availableLabels.length > 0 && (
          <div className={styles.labelSuggestions}>
            {availableLabels
              .filter((l) => !config.labels.includes(l.name))
              .map((l) => (
                <button
                  key={l.id}
                  className={styles.labelChipAdd}
                  onClick={() => addLabelValue(l.name)}
                  type="button"
                >
                  + {l.name}
                </button>
              ))}
          </div>
        )}
      </section>

      {/* ── Sincronización ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Sincronización</h3>
          <span className={styles.lastSync}>Última: {relativeDate(config.lastSyncAt)}</span>
        </div>
        <p className={styles.cardHint}>
          Se buscan los mails de los últimos días (base {DEFAULT_WINDOW_DAYS}); se amplía solo si
          pasó más tiempo desde la última sync. Podés ajustarlo para esta corrida.
        </p>

        <div className={styles.syncRow}>
          <label className={styles.windowLabel}>
            Sincronizar los últimos
            <div className={styles.windowInputWrap}>
              <input
                className={styles.windowInput}
                type="number"
                min={1}
                max={90}
                value={effectiveSyncWindow}
                onChange={(e) => setSyncWindow(Math.min(90, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
              />
              <span className={styles.windowUnit}>días</span>
            </div>
          </label>
          {syncWindow === null && suggested > DEFAULT_WINDOW_DAYS && (
            <span className={styles.suggestion}>
              Ampliado a {suggested} días por semanas sin sincronizar
            </span>
          )}
        </div>

        <div className={styles.syncActions}>
          <button
            className={styles.btnPrimary}
            disabled={!canSync || syncing}
            onClick={() => void handleSync()}
            type="button"
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
          <button
            className={styles.btnSecondaryNeutral}
            onClick={() => setReviewOpen(true)}
            disabled={syncing}
            type="button"
          >
            Revisar pendientes
          </button>
        </div>
        {syncMsg && <p className={styles.syncHint}>{syncMsg}</p>}
        {!canSync && (
          <p className={styles.syncHint}>
            {!config.linked
              ? 'Conectá tu cuenta para sincronizar.'
              : !tokenActive
                ? 'Reconectá tu cuenta para sincronizar en esta sesión.'
                : 'Agregá al menos un remitente o etiqueta para sincronizar.'}
          </p>
        )}
      </section>

      {reviewOpen && (
        <GmailImportModal isOpen syncing={syncing} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────

export default function IntegrationsPage(): React.ReactElement {
  const [selected, setSelected] = useState<IntegrationMeta['id'] | null>(null)

  const active = INTEGRATIONS.find((i) => i.id === selected) ?? null

  if (active) {
    return (
      <div className={styles.page}>
        <Breadcrumbs
          items={[
            { label: 'Integraciones', onClick: () => setSelected(null) },
            { label: active.name },
          ]}
        />
        <PageHeader title={active.name} subtitle={active.description} />
        {active.id === 'gmail' ? (
          <GmailPanel />
        ) : (
          <p className={styles.empty}>Esta integración estará disponible próximamente.</p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Integraciones"
        subtitle="Conectá fuentes de datos para importar gastos sin esperar al reporte de fin de mes"
      />

      <div className={styles.list}>
        {INTEGRATIONS.map((it) => {
          const isSoon = it.status === 'soon'
          return (
            <button
              key={it.id}
              className={[styles.item, isSoon ? styles.itemDisabled : ''].join(' ')}
              onClick={() => !isSoon && setSelected(it.id)}
              disabled={isSoon}
              type="button"
            >
              <div className={styles.itemIcon}>{it.icon}</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemLabel}>{it.name}</span>
                <span className={styles.itemDesc}>{it.description}</span>
              </div>
              {isSoon ? (
                <span className={styles.soonBadge}>Próximamente</span>
              ) : (
                <span className={styles.chevron}>›</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
