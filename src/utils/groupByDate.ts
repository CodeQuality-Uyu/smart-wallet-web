// src/utils/groupByDate.ts

import type { Expense } from '@/types/models'

export interface ExpenseGroup {
  label: string
  date: string
  expenses: Expense[]
}

export function groupExpensesByDate(expenses: Expense[]): ExpenseGroup[] {
  const map = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const existing = map.get(expense.date) ?? []
    map.set(expense.date, [...existing, expense])
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      expenses: items,
    }))
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`) // noon to avoid TZ issues
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return 'Hoy'
  if (isSameDay(date, yesterday)) return 'Ayer'

  return date.toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
