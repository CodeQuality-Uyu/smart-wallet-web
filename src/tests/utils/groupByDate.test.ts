// src/tests/utils/groupByDate.test.ts

import { describe, it, expect } from 'vitest'
import { groupExpensesByDate } from '@/utils/groupByDate'
import { mockExpenses } from '../mocks/data/expenses'

describe('groupExpensesByDate', () => {
  it('groups expenses by date', () => {
    const groups = groupExpensesByDate(mockExpenses)
    expect(groups.length).toBeGreaterThan(0)
    groups.forEach((g) => {
      g.expenses.forEach((e) => expect(e.date).toBe(g.date))
    })
  })

  it('sorts groups newest first', () => {
    const groups = groupExpensesByDate(mockExpenses)
    for (let i = 0; i < groups.length - 1; i++) {
      expect(groups[i]!.date >= groups[i + 1]!.date).toBe(true)
    }
  })

  it('labels today correctly', () => {
    const today = new Date().toISOString().split('T')[0]!
    const todayExpense = { ...mockExpenses[0]!, date: today }
    const groups = groupExpensesByDate([todayExpense])
    expect(groups[0]?.label).toBe('Hoy')
  })

  it('returns empty array for no expenses', () => {
    expect(groupExpensesByDate([])).toEqual([])
  })
})
