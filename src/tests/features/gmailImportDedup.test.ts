// src/tests/features/gmailImportDedup.test.ts

import { describe, it, expect } from 'vitest'
import { senderPriority, findBatchDuplicates } from '@/features/integrations/gmailImportDedup'
import { Currency } from '@/types/enums'
import type { GmailPendingItem } from '@/types/models'

function item(id: string, from: string, over: Partial<GmailPendingItem> = {}): GmailPendingItem {
  return {
    gmailMessageId: id,
    from,
    date: '2026-07-16',
    description: 'X',
    amount: 850,
    currency: Currency.UYU,
    addedAt: '2026-07-21T00:00:00.000Z',
    ...over,
  }
}

const SENDERS = ['itau.com.uy', 'mercadopago.com.uy']

describe('senderPriority', () => {
  it('usa el orden de la lista (menor índice = más peso)', () => {
    expect(senderPriority('Itaú <avisos@itau.com.uy>', SENDERS)).toBe(0)
    expect(senderPriority('MercadoPago <x@mercadopago.com.uy>', SENDERS)).toBe(1)
  })

  it('los que no matchean ningún remitente quedan al final', () => {
    expect(senderPriority('Otro <x@otro.com>', SENDERS)).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('findBatchDuplicates', () => {
  it('marca como perdedores a todos menos el de mayor prioridad', () => {
    const losers = findBatchDuplicates(
      [
        item('mp', 'MercadoPago <x@mercadopago.com.uy>'),
        item('itau', 'Itaú <avisos@itau.com.uy>'),
      ],
      SENDERS,
    )
    // itau tiene prioridad 0 → gana; mp queda como perdedor
    expect([...losers]).toEqual(['mp'])
  })

  it('no marca nada si no hay grupos de 2+', () => {
    const losers = findBatchDuplicates(
      [
        item('a', 'Itaú <avisos@itau.com.uy>', { amount: 100 }),
        item('b', 'Itaú <avisos@itau.com.uy>', { amount: 200 }),
      ],
      SENDERS,
    )
    expect(losers.size).toBe(0)
  })

  it('no agrupa si difiere monto, moneda o fecha', () => {
    const losers = findBatchDuplicates(
      [
        item('a', 'Itaú <avisos@itau.com.uy>'),
        item('b', 'MercadoPago <x@mercadopago.com.uy>', { date: '2026-07-18' }),
      ],
      SENDERS,
    )
    expect(losers.size).toBe(0)
  })
})
