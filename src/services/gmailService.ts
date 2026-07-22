// src/services/gmailService.ts

import { getGmailBackend } from '@/backend'
import type { GmailFetchParams } from '@/backend/types'
import type { GmailLabel, GmailRawMessage } from '@/types/models'

export const gmailService = {
  async listLabels(): Promise<GmailLabel[]> {
    return (await getGmailBackend()).listLabels()
  },
  async fetchMessages(params: GmailFetchParams): Promise<GmailRawMessage[]> {
    return (await getGmailBackend()).fetchMessages(params)
  },
}
