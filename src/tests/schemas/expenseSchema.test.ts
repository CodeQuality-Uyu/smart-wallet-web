// src/tests/schemas/expenseSchema.test.ts

import { describe, it, expect } from 'vitest'
import { expenseSchema } from '@/features/expenses/schemas/expenseSchema'
import { Currency, PaymentType } from '@/types/enums'

const VALID = {
  description: 'Almuerzo McDonald\'s',
  amount: 12.9,
  currency: Currency.USD,
  paymentType: PaymentType.CreditItau,
  categoryIds: ['cat-1'],
  placeId: 'place-1',
  date: '2026-03-23',
}

describe('expenseSchema', () => {
  it('validates a correct expense', async () => {
    await expect(expenseSchema.validate(VALID)).resolves.toBeDefined()
  })

  it('rejects missing description', async () => {
    await expect(expenseSchema.validate({ ...VALID, description: '' })).rejects.toThrow(
      'Description is required'
    )
  })

  it('rejects description shorter than 2 chars', async () => {
    await expect(expenseSchema.validate({ ...VALID, description: 'A' })).rejects.toThrow(
      'Minimum 2 characters'
    )
  })

  it('rejects zero amount', async () => {
    await expect(expenseSchema.validate({ ...VALID, amount: 0 })).rejects.toThrow(
      'Must be greater than 0'
    )
  })

  it('rejects negative amount', async () => {
    await expect(expenseSchema.validate({ ...VALID, amount: -5 })).rejects.toThrow()
  })

  it('rejects invalid currency', async () => {
    await expect(expenseSchema.validate({ ...VALID, currency: 'EUR' })).rejects.toThrow(
      'Invalid currency'
    )
  })

  it('rejects empty categoryIds', async () => {
    await expect(expenseSchema.validate({ ...VALID, categoryIds: [] })).rejects.toThrow(
      'Select at least one category'
    )
  })

  it('rejects invalid date format', async () => {
    await expect(expenseSchema.validate({ ...VALID, date: '23-03-2026' })).rejects.toThrow(
      'Invalid date format'
    )
  })

  it('accepts optional placeId as empty string', async () => {
    await expect(expenseSchema.validate({ ...VALID, placeId: '' })).resolves.toBeDefined()
  })
})
