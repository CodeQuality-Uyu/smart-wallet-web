// src/utils/groupByDate.ts

import type { Expense, Place, Category } from '@/types/models'

export interface ExpenseGroup {
  label: string
  date: string
  expenses: Expense[]
}

// ─── Group by day ─────────────────────────────────────────

export function groupExpensesByDate(expenses: Expense[]): ExpenseGroup[] {
  const map = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const existing = map.get(expense.date) ?? []
    map.set(expense.date, [...existing, expense])
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      expenses: items,
    }))
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
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

// ─── Group by week ────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  const day = date.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0] as string
}

function formatWeekLabel(mondayStr: string): string {
  const monday = new Date(`${mondayStr}T12:00:00`)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function groupExpensesByWeek(expenses: Expense[]): ExpenseGroup[] {
  const map = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const key = getWeekStart(expense.date)
    const existing = map.get(key) ?? []
    map.set(key, [...existing, expense])
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      date: key,
      label: formatWeekLabel(key),
      expenses: items,
    }))
}

// ─── Group by place ───────────────────────────────────────

export function groupExpensesByPlace(expenses: Expense[], places: Place[]): ExpenseGroup[] {
  const map = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const key = expense.placeId ?? '__none__'
    const existing = map.get(key) ?? []
    map.set(key, [...existing, expense])
  }

  const placeMap = new Map(places.map((p) => [p.id, p.name]))

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([key, items]) => ({
      date: key,
      label: key === '__none__' ? 'Sin lugar' : (placeMap.get(key) ?? key),
      expenses: items,
    }))
}

// ─── Group by category ────────────────────────────────────

export function groupExpensesByCategory(expenses: Expense[], categories: Category[]): ExpenseGroup[] {
  const map = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const key = expense.categoryIds[0] ?? '__none__'
    const existing = map.get(key) ?? []
    map.set(key, [...existing, expense])
  }

  const catMap = new Map(categories.map((c) => [c.id, `${c.icon} ${c.name}`]))

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([key, items]) => ({
      date: key,
      label: key === '__none__' ? 'Sin categoría' : (catMap.get(key) ?? key),
      expenses: items,
    }))
}
