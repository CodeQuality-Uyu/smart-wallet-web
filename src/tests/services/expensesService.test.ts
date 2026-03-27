// src/tests/services/expensesService.test.ts

import { describe, it, expect } from 'vitest'
import { expensesService } from '@/services/expensesService'
import { Currency } from '@/types/enums'

describe('expensesService', () => {
  it('lists expenses', async () => {
    const result = await expensesService.list()
    expect(result.data).toBeInstanceOf(Array)
    expect(result.total).toBeGreaterThan(0)
  })

  it('gets a specific expense by id', async () => {
    const result = await expensesService.getById('exp-1')
    expect(result.id).toBe('exp-1')
    expect(result.description).toBe("Almuerzo McDonald's")
  })

  it('returns 404 for unknown id', async () => {
    await expect(expensesService.getById('does-not-exist')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('creates an expense', async () => {
    const payload = {
      description: 'Test gasto',
      amount: 99,
      currency: Currency.UYU,
      cardId: 'card-1',
      categoryIds: ['cat-1'],
      date: '2026-03-23',
    }
    const result = await expensesService.create(payload)
    expect(result.id).toBeDefined()
    expect(result.description).toBe('Test gasto')
  })

  it('updates an expense', async () => {
    const result = await expensesService.update('exp-1', { description: 'Updated' })
    expect(result.description).toBe('Updated')
  })

  it('deletes an expense without throwing', async () => {
    await expect(expensesService.remove('exp-1')).resolves.toBeUndefined()
  })

  it('adds a ticket line', async () => {
    const line = await expensesService.addTicketLine('exp-1', { name: 'Big Mac', amount: 5.9 })
    expect(line.id).toBeDefined()
    expect(line.name).toBe('Big Mac')
  })
})
