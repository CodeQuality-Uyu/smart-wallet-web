// src/tests/mocks/data/gmailIntegration.ts

import type { GmailIntegration, GmailQueue } from '@/types/models'

export const mockGmailIntegration: GmailIntegration = {
  linked: false,
  senders: [],
  labels: [],
  lastSyncAt: null,
}

// Cola vacía: la primera sincronización la puebla (fetch → parse → cola).
export const mockGmailQueue: GmailQueue = {
  pending: [],
  seenIds: [],
}
