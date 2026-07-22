// src/services/integrationsService.ts

import { getIntegrationsBackend } from '@/backend'
import type { GmailIntegration, GmailQueue, GmailPendingItem } from '@/types/models'

export const integrationsService = {
  async getGmail(): Promise<GmailIntegration> {
    return (await getIntegrationsBackend()).getGmail()
  },
  async setGmail(patch: Partial<GmailIntegration>): Promise<GmailIntegration> {
    return (await getIntegrationsBackend()).setGmail(patch)
  },
  async getGmailQueue(): Promise<GmailQueue> {
    return (await getIntegrationsBackend()).getGmailQueue()
  },
  async appendGmailSeen(ids: string[]): Promise<GmailQueue> {
    return (await getIntegrationsBackend()).appendGmailSeen(ids)
  },
  async appendGmailPending(items: GmailPendingItem[]): Promise<GmailQueue> {
    return (await getIntegrationsBackend()).appendGmailPending(items)
  },
  async removeGmailPending(messageIds: string[]): Promise<GmailQueue> {
    return (await getIntegrationsBackend()).removeGmailPending(messageIds)
  },
}
