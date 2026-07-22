// src/services/gmailSyncService.ts
// Orquesta una sincronización manual de Gmail:
//   fetch de mails → filtrar los ya vistos → parse con Gemini → cola (pendientes + vistos)
// No crea gastos: eso pasa en la revisión (GmailImportModal). Tampoco toca lastSyncAt
// (eso lo hace el caller vía la mutation de config, para mantener el cache sincronizado).

import { gmailService } from '@/services/gmailService'
import { parseEmails } from '@/services/gmailParseService'
import { integrationsService } from '@/services/integrationsService'
import type { GmailPendingItem, GmailQueue } from '@/types/models'

export interface GmailSyncParams {
  senders: string[]
  labels: string[]
  windowDays: number
  /** Ids ya vistos (de la cola) para no reprocesarlos. */
  seenIds: string[]
  /** ISO de "ahora" para sellar addedAt en los nuevos pendientes. */
  now: string
}

export interface GmailSyncResult {
  /** Mails que devolvió Gmail dentro de la ventana. */
  fetched: number
  /** Mails nuevos (no vistos) que se procesaron. */
  fresh: number
  /** Gastos candidatos agregados a la cola. */
  added: number
  /** Estado final de la cola tras la sincronización. */
  queue: GmailQueue
}

export async function syncGmail(params: GmailSyncParams): Promise<GmailSyncResult> {
  const { senders, labels, windowDays, seenIds, now } = params

  const messages = await gmailService.fetchMessages({ senders, labels, windowDays })

  const seen = new Set(seenIds)
  const fresh = messages.filter((m) => !seen.has(m.id))

  if (fresh.length === 0) {
    const queue = await integrationsService.getGmailQueue()
    return { fetched: messages.length, fresh: 0, added: 0, queue }
  }

  const parsed = await parseEmails(fresh)
  const items: GmailPendingItem[] = parsed.map((line) => ({ ...line, addedAt: now }))

  // Marcar TODOS los mails nuevos como vistos (incluidos los que no eran
  // transacciones), para no reprocesarlos en la próxima sync.
  await integrationsService.appendGmailSeen(fresh.map((m) => m.id))
  const queue =
    items.length > 0
      ? await integrationsService.appendGmailPending(items)
      : await integrationsService.getGmailQueue()

  return { fetched: messages.length, fresh: fresh.length, added: items.length, queue }
}
