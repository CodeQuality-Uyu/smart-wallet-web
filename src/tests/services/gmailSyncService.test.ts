// src/tests/services/gmailSyncService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncGmail } from '@/services/gmailSyncService'
import { gmailService } from '@/services/gmailService'
import { parseEmails } from '@/services/gmailParseService'
import { integrationsService } from '@/services/integrationsService'
import { Currency } from '@/types/enums'
import type { GmailQueue, GmailRawMessage } from '@/types/models'

vi.mock('@/services/gmailService', () => ({ gmailService: { fetchMessages: vi.fn() } }))
vi.mock('@/services/gmailParseService', () => ({ parseEmails: vi.fn() }))
vi.mock('@/services/integrationsService', () => ({
  integrationsService: {
    getGmailQueue: vi.fn(),
    appendGmailSeen: vi.fn(),
    appendGmailPending: vi.fn(),
  },
}))

function msg(id: string): GmailRawMessage {
  return { id, from: 'Banco', subject: 'Compra', date: '', snippet: '', body: 'x' }
}

const emptyQueue: GmailQueue = { pending: [], seenIds: [] }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('syncGmail', () => {
  it('filtra los ya vistos, parsea solo los nuevos y los agrega a la cola', async () => {
    const finalQueue: GmailQueue = { pending: [], seenIds: ['a', 'b'] }
    vi.mocked(gmailService.fetchMessages).mockResolvedValue([msg('a'), msg('b')])
    vi.mocked(parseEmails).mockResolvedValue([
      { gmailMessageId: 'b', date: '2026-07-19', description: 'X', amount: 100, currency: Currency.UYU, from: 'Banco' },
    ])
    vi.mocked(integrationsService.appendGmailSeen).mockResolvedValue(emptyQueue)
    vi.mocked(integrationsService.appendGmailPending).mockResolvedValue(finalQueue)

    const result = await syncGmail({
      senders: ['banco@x.com'],
      labels: [],
      windowDays: 7,
      seenIds: ['a'],
      now: '2026-07-21T00:00:00.000Z',
    })

    // Solo 'b' (nuevo) se parsea
    expect(vi.mocked(parseEmails).mock.calls[0]![0].map((m) => m.id)).toEqual(['b'])
    // Se marca 'b' como visto y se agrega con addedAt sellado
    expect(integrationsService.appendGmailSeen).toHaveBeenCalledWith(['b'])
    expect(integrationsService.appendGmailPending).toHaveBeenCalledWith([
      expect.objectContaining({ gmailMessageId: 'b', addedAt: '2026-07-21T00:00:00.000Z' }),
    ])
    expect(result).toMatchObject({ fetched: 2, fresh: 1, added: 1, queue: finalQueue })
  })

  it('si no hay mails nuevos, no parsea ni escribe y devuelve la cola actual', async () => {
    vi.mocked(gmailService.fetchMessages).mockResolvedValue([msg('a')])
    vi.mocked(integrationsService.getGmailQueue).mockResolvedValue(emptyQueue)

    const result = await syncGmail({
      senders: ['banco@x.com'],
      labels: [],
      windowDays: 7,
      seenIds: ['a'],
      now: '2026-07-21T00:00:00.000Z',
    })

    expect(parseEmails).not.toHaveBeenCalled()
    expect(integrationsService.appendGmailSeen).not.toHaveBeenCalled()
    expect(result).toMatchObject({ fetched: 1, fresh: 0, added: 0 })
  })
})
