// src/features/integrations/gmailImportDedup.ts
// Detección de duplicados DENTRO de un lote de import de Gmail: mails distintos
// que son el mismo gasto (mismo monto+moneda+fecha), típico de pagar con
// MercadoPago y recibir aviso del procesador y del banco.

import type { GmailPendingItem } from '@/types/models'

/**
 * Prioridad de un remitente según el orden configurado (menor índice = más peso).
 * Los que no matchean ningún remitente (ej. traídos por etiqueta) quedan al final.
 */
export function senderPriority(from: string, senders: string[]): number {
  const f = from.toLowerCase()
  const idx = senders.findIndex((s) => s.trim() && f.includes(s.trim().toLowerCase()))
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

/**
 * Devuelve los ids "perdedores" de cada grupo de duplicados (los que se dejan sin
 * tildar). Gana el remitente de mayor prioridad; el resto se marcan como perdedores.
 */
export function findBatchDuplicates(pending: GmailPendingItem[], senders: string[]): Set<string> {
  const groups = new Map<string, GmailPendingItem[]>()
  for (const p of pending) {
    const key = `${p.currency}|${p.amount}|${p.date}`
    const g = groups.get(key)
    if (g) g.push(p)
    else groups.set(key, [p])
  }

  const losers = new Set<string>()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort(
      (a, b) => senderPriority(a.from, senders) - senderPriority(b.from, senders),
    )
    for (let i = 1; i < sorted.length; i++) losers.add(sorted[i].gmailMessageId)
  }
  return losers
}
