// src/tests/schemas/recurringSchema.test.ts

import { describe, it, expect } from 'vitest'
import { recurringSchema } from '@/features/recurring/schemas/recurringSchema'
import { Currency, RecurringMode } from '@/types/enums'

const VALID_AUTO = {
  name: 'Netflix',
  icon: '🎬',
  amount: 6.99,
  currency: Currency.USD,
  categoryId: 'cat-7',
  cardId: 'card-4',
  mode: RecurringMode.Auto,
}

const VALID_MANUAL = {
  ...VALID_AUTO,
  name: 'OSE — Agua',
  icon: '💧',
  amount: 890,
  currency: Currency.UYU,
  mode: RecurringMode.Manual,
  dueDayOfMonth: 12,
}

describe('recurringSchema', () => {
  it('validates a correct auto recurring', async () => {
    await expect(recurringSchema.validate(VALID_AUTO)).resolves.toBeDefined()
  })

  it('validates a correct manual recurring', async () => {
    await expect(recurringSchema.validate(VALID_MANUAL)).resolves.toBeDefined()
  })

  it('requires dueDayOfMonth for manual mode', async () => {
    const { dueDayOfMonth: _, ...withoutDay } = VALID_MANUAL
    await expect(recurringSchema.validate(withoutDay)).rejects.toThrow(
      'Due day is required for manual payments'
    )
  })

  it('does not require dueDayOfMonth for auto mode', async () => {
    await expect(recurringSchema.validate(VALID_AUTO)).resolves.toBeDefined()
  })

  it('rejects invalid day (0)', async () => {
    await expect(
      recurringSchema.validate({ ...VALID_MANUAL, dueDayOfMonth: 0 })
    ).rejects.toThrow()
  })

  it('rejects invalid day (32)', async () => {
    await expect(
      recurringSchema.validate({ ...VALID_MANUAL, dueDayOfMonth: 32 })
    ).rejects.toThrow()
  })

  it('rejects negative amount', async () => {
    await expect(
      recurringSchema.validate({ ...VALID_AUTO, amount: -1 })
    ).rejects.toThrow()
  })

  it('requires categoryId', async () => {
    const { categoryId: _, ...withoutCat } = VALID_AUTO
    await expect(recurringSchema.validate(withoutCat)).rejects.toThrow()
  })
})
