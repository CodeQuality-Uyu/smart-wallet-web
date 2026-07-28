// src/tests/features/installments.test.ts

import { describe, it, expect } from 'vitest'
import {
  addMonthsClamped,
  splitInstallmentAmounts,
  buildInstallmentPayloads,
} from '@/features/expenses/installments'
import { Currency } from '@/types/enums'
import type { CreateExpensePayload } from '@/types/models'

describe('addMonthsClamped', () => {
  it('adds whole months keeping the day', () => {
    expect(addMonthsClamped('2026-07-15', 0)).toBe('2026-07-15')
    expect(addMonthsClamped('2026-07-15', 1)).toBe('2026-08-15')
    expect(addMonthsClamped('2026-07-15', 9)).toBe('2027-04-15')
  })

  it('rolls the year over', () => {
    expect(addMonthsClamped('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('clamps the day to the end of a shorter month', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28') // 2026 no bisiesto
    expect(addMonthsClamped('2026-01-31', 3)).toBe('2026-04-30')
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29') // bisiesto
  })
})

describe('splitInstallmentAmounts', () => {
  it('divides evenly when possible', () => {
    expect(splitInstallmentAmounts(10000, 10)).toEqual(Array(10).fill(1000))
  })

  it('absorbs the rounding remainder in the last installment and sums to the total', () => {
    const amounts = splitInstallmentAmounts(10000, 3)
    expect(amounts.slice(0, 2)).toEqual([3333.33, 3333.33])
    expect(amounts[2]).toBeCloseTo(3333.34, 2)
    const sum = amounts.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(10000, 2)
  })

  it('handles a single installment', () => {
    expect(splitInstallmentAmounts(999.99, 1)).toEqual([999.99])
  })
})

describe('buildInstallmentPayloads', () => {
  const base: CreateExpensePayload = {
    description: 'Notebook',
    amount: 10000,
    currency: Currency.UYU,
    cardId: 'card-1',
    categoryIds: ['cat-1'],
    date: '2026-07-15',
  }

  it('builds one payload per installment with sequential months', () => {
    const payloads = buildInstallmentPayloads(base, 10, 'group-1')
    expect(payloads).toHaveLength(10)
    expect(payloads[0]).toMatchObject({
      amount: 1000,
      date: '2026-07-15',
      installmentGroupId: 'group-1',
      installmentNumber: 1,
      installmentCount: 10,
      installmentTotalAmount: 10000,
    })
    expect(payloads[9]).toMatchObject({ date: '2027-04-15', installmentNumber: 10, amount: 1000 })
    // El total original se preserva y la suma coincide.
    const sum = payloads.reduce((a, p) => a + p.amount, 0)
    expect(sum).toBeCloseTo(10000, 2)
  })

  it('carries over the other fields untouched', () => {
    const [first] = buildInstallmentPayloads(base, 3, 'g')
    expect(first).toMatchObject({
      description: 'Notebook',
      currency: Currency.UYU,
      cardId: 'card-1',
      categoryIds: ['cat-1'],
    })
  })
})
