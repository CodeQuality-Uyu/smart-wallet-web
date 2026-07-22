// src/backend/msw/gmail.ts

import { httpClient } from '@/api/httpClient'
import type { IGmailBackend, GmailFetchParams } from '../types'
import type { GmailLabel, GmailRawMessage } from '@/types/models'

export const mswGmailBackend: IGmailBackend = {
  async listLabels(): Promise<GmailLabel[]> {
    const { data } = await httpClient.get<GmailLabel[]>('/gmail/labels')
    return data
  },

  async fetchMessages(params: GmailFetchParams): Promise<GmailRawMessage[]> {
    const { data } = await httpClient.post<GmailRawMessage[]>('/gmail/messages', params)
    return data
  },
}
