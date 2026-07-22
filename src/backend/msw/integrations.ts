// src/backend/msw/integrations.ts

import { httpClient } from '@/api/httpClient'
import type { IIntegrationsBackend } from '../types'
import type { GmailIntegration, GmailQueue, GmailPendingItem } from '@/types/models'

export const mswIntegrationsBackend: IIntegrationsBackend = {
  async getGmail(): Promise<GmailIntegration> {
    const { data } = await httpClient.get<GmailIntegration>('/integrations/gmail')
    return data
  },

  async setGmail(patch: Partial<GmailIntegration>): Promise<GmailIntegration> {
    const { data } = await httpClient.patch<GmailIntegration>('/integrations/gmail', patch)
    return data
  },

  async getGmailQueue(): Promise<GmailQueue> {
    const { data } = await httpClient.get<GmailQueue>('/integrations/gmail/queue')
    return data
  },

  async appendGmailSeen(ids: string[]): Promise<GmailQueue> {
    const { data } = await httpClient.post<GmailQueue>('/integrations/gmail/queue/seen', { ids })
    return data
  },

  async appendGmailPending(items: GmailPendingItem[]): Promise<GmailQueue> {
    const { data } = await httpClient.post<GmailQueue>('/integrations/gmail/queue/pending', { items })
    return data
  },

  async removeGmailPending(messageIds: string[]): Promise<GmailQueue> {
    const { data } = await httpClient.post<GmailQueue>('/integrations/gmail/queue/pending/remove', {
      messageIds,
    })
    return data
  },
}
