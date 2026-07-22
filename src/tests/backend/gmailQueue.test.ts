// src/tests/backend/gmailQueue.test.ts

import { describe, it, expect } from 'vitest'
import { mergeSeenIds, mergePending } from '@/backend/firestore/integrations'
import { Currency } from '@/types/enums'
import type { GmailPendingItem } from '@/types/models'

function item(id: string, description = 'X'): GmailPendingItem {
  return {
    gmailMessageId: id,
    date: '2026-07-19',
    description,
    amount: 100,
    currency: Currency.UYU,
    addedAt: '2026-07-21T00:00:00.000Z',
  }
}

describe('mergeSeenIds', () => {
  it('une sin duplicar', () => {
    expect(mergeSeenIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('conserva los más recientes al superar el tope (2000)', () => {
    const existing = Array.from({ length: 2000 }, (_, i) => `old-${i}`)
    const result = mergeSeenIds(existing, ['new-1', 'new-2'])
    expect(result).toHaveLength(2000)
    expect(result).toContain('new-1')
    expect(result).toContain('new-2')
    expect(result).not.toContain('old-0') // los más viejos se descartan
  })
})

describe('mergePending', () => {
  it('agrega candidatos nuevos', () => {
    const result = mergePending([item('a')], [item('b')])
    expect(result.map((p) => p.gmailMessageId)).toEqual(['a', 'b'])
  })

  it('no duplica por gmailMessageId (conserva el existente)', () => {
    const result = mergePending([item('a', 'original')], [item('a', 'nuevo')])
    expect(result).toHaveLength(1)
    expect(result[0]!.description).toBe('original')
  })
})
