// src/tests/schemas/expenseSchema.test.ts

import { describe, it, expect } from 'vitest'
import { expenseSchema } from '@/features/expenses/schemas/expenseSchema'
import { Currency } from '@/types/enums'

const VALID = {
  description: 'Almuerzo McDonald\'s',
  amount: 12.9,
  currency: Currency.USD,
  cardId: 'card-2',
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
      'La descripción es requerida'
    )
  })

  it('rejects description shorter than 2 chars', async () => {
    await expect(expenseSchema.validate({ ...VALID, description: 'A' })).rejects.toThrow(
      'Mínimo 2 caracteres'
    )
  })

  it('rejects zero amount', async () => {
    await expect(expenseSchema.validate({ ...VALID, amount: 0 })).rejects.toThrow(
      'El monto debe ser mayor a 0'
    )
  })

  it('rejects negative amount', async () => {
    await expect(expenseSchema.validate({ ...VALID, amount: -5 })).rejects.toThrow()
  })

  it('rejects invalid currency', async () => {
    await expect(expenseSchema.validate({ ...VALID, currency: 'EUR' })).rejects.toThrow(
      'Moneda inválida'
    )
  })

  it('rejects empty categoryIds', async () => {
    await expect(expenseSchema.validate({ ...VALID, categoryIds: [] })).rejects.toThrow(
      'Seleccioná al menos una categoría'
    )
  })

  it('rejects invalid date format', async () => {
    await expect(expenseSchema.validate({ ...VALID, date: '23-03-2026' })).rejects.toThrow(
      'Formato de fecha inválido'
    )
  })

  it('rejects missing placeId', async () => {
    await expect(expenseSchema.validate({ ...VALID, placeId: '' })).rejects.toThrow(
      'El lugar es requerido'
    )
  })
})
