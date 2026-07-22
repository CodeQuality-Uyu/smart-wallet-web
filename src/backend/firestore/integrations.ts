// src/backend/firestore/integrations.ts
// Configuración de integraciones guardada como campo del doc users/{uid}.
// (Mismo patrón que userPrefs → no requiere cambios en firestore.rules.)

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IIntegrationsBackend } from '../types'
import type { GmailIntegration, GmailQueue, GmailPendingItem } from '@/types/models'

export const DEFAULT_GMAIL_INTEGRATION: GmailIntegration = {
  linked: false,
  senders: [],
  labels: [],
  lastSyncAt: null,
}

// Tope de ids "vistos" que guardamos (los más recientes). Con sync manual semanal
// cubre años; evita que el campo crezca sin límite.
const SEEN_CAP = 2000

/** Une ids vistos sin duplicar y conserva los más recientes hasta el tope. */
export function mergeSeenIds(existing: string[], incoming: string[]): string[] {
  const set = new Set(existing)
  for (const id of incoming) set.add(id)
  const arr = [...set]
  return arr.length > SEEN_CAP ? arr.slice(arr.length - SEEN_CAP) : arr
}

/** Agrega candidatos a la cola sin duplicar por gmailMessageId. */
export function mergePending(
  existing: GmailPendingItem[],
  incoming: GmailPendingItem[],
): GmailPendingItem[] {
  const byId = new Map(existing.map((p) => [p.gmailMessageId, p]))
  for (const item of incoming) if (!byId.has(item.gmailMessageId)) byId.set(item.gmailMessageId, item)
  return [...byId.values()]
}

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreIntegrationsBackend: IIntegrationsBackend = {
  async getGmail(): Promise<GmailIntegration> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    const stored = snap.exists()
      ? (snap.data()['gmailIntegration'] as Partial<GmailIntegration> | undefined)
      : undefined
    return { ...DEFAULT_GMAIL_INTEGRATION, ...stored }
  },

  async setGmail(patch: Partial<GmailIntegration>): Promise<GmailIntegration> {
    const uid = requireUid()
    const current = await firestoreIntegrationsBackend.getGmail()
    const merged: GmailIntegration = { ...current, ...patch }
    await setDoc(doc(firestore, 'users', uid), { gmailIntegration: merged }, { merge: true })
    return merged
  },

  async getGmailQueue(): Promise<GmailQueue> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    const stored = snap.exists()
      ? (snap.data()['gmailQueue'] as Partial<GmailQueue> | undefined)
      : undefined
    return {
      pending: stored?.pending ?? [],
      seenIds: stored?.seenIds ?? [],
    }
  },

  async appendGmailSeen(ids: string[]): Promise<GmailQueue> {
    const uid = requireUid()
    const current = await firestoreIntegrationsBackend.getGmailQueue()
    const next: GmailQueue = { ...current, seenIds: mergeSeenIds(current.seenIds, ids) }
    await setDoc(doc(firestore, 'users', uid), { gmailQueue: next }, { merge: true })
    return next
  },

  async appendGmailPending(items: GmailPendingItem[]): Promise<GmailQueue> {
    const uid = requireUid()
    const current = await firestoreIntegrationsBackend.getGmailQueue()
    const next: GmailQueue = { ...current, pending: mergePending(current.pending, items) }
    await setDoc(doc(firestore, 'users', uid), { gmailQueue: next }, { merge: true })
    return next
  },

  async removeGmailPending(messageIds: string[]): Promise<GmailQueue> {
    const uid = requireUid()
    const current = await firestoreIntegrationsBackend.getGmailQueue()
    const remove = new Set(messageIds)
    const next: GmailQueue = {
      ...current,
      pending: current.pending.filter((p) => !remove.has(p.gmailMessageId)),
    }
    await setDoc(doc(firestore, 'users', uid), { gmailQueue: next }, { merge: true })
    return next
  },
}
