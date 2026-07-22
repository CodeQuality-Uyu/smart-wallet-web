// src/tests/services/statementService.test.ts

import { describe, it, expect } from 'vitest'
import { findBestDuplicate } from '@/services/statementService'
import { Currency } from '@/types/enums'
import type { Expense, StatementLine } from '@/types/models'

function expense(over: Partial<Expense>): Expense {
  return {
    id: 'e1',
    description: 'TIENDA INGLESA',
    amount: 1234,
    currency: Currency.UYU,
    cardId: 'c1',
    categoryIds: [],
    date: '2026-07-19',
    ticketLines: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

const line: StatementLine = {
  date: '2026-07-19',
  description: 'TIENDA INGLESA',
  amount: 1234,
  currency: Currency.UYU,
}

describe('findBestDuplicate', () => {
  it('matchea mismo monto+moneda+fecha+descripción', () => {
    const match = findBestDuplicate(line, [expense({})])
    expect(match).not.toBeNull()
    expect(match?.expenseId).toBe('e1')
  })

  it('no matchea si el monto difiere', () => {
    expect(findBestDuplicate(line, [expense({ amount: 999 })])).toBeNull()
  })

  it('no matchea si la moneda difiere', () => {
    expect(findBestDuplicate(line, [expense({ currency: Currency.USD })])).toBeNull()
  })

  it('no matchea si la fecha está a más de 2 días', () => {
    expect(findBestDuplicate(line, [expense({ date: '2026-07-25' })])).toBeNull()
  })

  it('descarta match débil: 2 días de diferencia y descripción no relacionada', () => {
    // score = 0.5 + 0.1 (2 días) + 0 (sin coincidencia) = 0.6, no supera el umbral > 0.6
    expect(findBestDuplicate(line, [expense({ date: '2026-07-17', description: 'OTRA COSA' })])).toBeNull()
  })

  it('elige el de mayor score entre varios candidatos', () => {
    const match = findBestDuplicate(line, [
      expense({ id: 'lejano', date: '2026-07-18', description: 'algo distinto' }),
      expense({ id: 'exacto', date: '2026-07-19', description: 'TIENDA INGLESA' }),
    ])
    expect(match?.expenseId).toBe('exacto')
  })
})
