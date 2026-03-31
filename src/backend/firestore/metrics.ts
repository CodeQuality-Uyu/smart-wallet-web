// src/backend/firestore/metrics.ts
// Metrics computed client-side from Firestore expenses, categories, and recurring data.

import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import { MetricsPeriod, Currency, RecurringFrequency, RecurringStatus } from '@/types/enums'
import type { IMetricsBackend, MetricsSummary, MetricsPeriod as MPeriod } from '../types'
import type { Expense, Category, RecurringExpense } from '@/types/models'

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0] as string
}

function getPeriodBounds(period: MPeriod): { start: string; end: string } {
  const now = new Date()
  const today = isoDate(now)
  if (period === MetricsPeriod.SevenDays) {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    return { start: isoDate(d), end: today }
  }
  if (period === MetricsPeriod.Month) {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return { start: `${y}-${m}-01`, end: today }
  }
  if (period === MetricsPeriod.ThreeMonths) {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    return { start: isoDate(d), end: today }
  }
  // Year
  return { start: `${now.getFullYear()}-01-01`, end: today }
}

function getPreviousPeriodBounds(period: MPeriod): { start: string; end: string } {
  const now = new Date()
  if (period === MetricsPeriod.SevenDays) {
    const end = new Date(now); end.setDate(end.getDate() - 7)
    const start = new Date(end); start.setDate(start.getDate() - 7)
    return { start: isoDate(start), end: isoDate(end) }
  }
  if (period === MetricsPeriod.Month) {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: isoDate(first), end: isoDate(last) }
  }
  if (period === MetricsPeriod.ThreeMonths) {
    const end = new Date(now); end.setMonth(end.getMonth() - 3)
    const start = new Date(end); start.setMonth(start.getMonth() - 3)
    return { start: isoDate(start), end: isoDate(end) }
  }
  // Year
  const prev = now.getFullYear() - 1
  return { start: `${prev}-01-01`, end: `${prev}-12-31` }
}

function sumByCurrency(expenses: Expense[], currency: Currency): number {
  return expenses.filter((e) => e.currency === currency).reduce((s, e) => s + e.amount, 0)
}

export const firestoreMetricsBackend: IMetricsBackend = {
  async getSummary(period: MPeriod): Promise<MetricsSummary> {
    const uid = requireUid()

    // Fetch all expenses, categories, and recurring in parallel
    const [expSnap, catSnap, recSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'users', uid, 'expenses'), orderBy('date', 'desc'))),
      getDocs(query(collection(firestore, 'users', uid, 'categories'), orderBy('name', 'asc'))),
      getDocs(query(collection(firestore, 'users', uid, 'recurring'), orderBy('name', 'asc'))),
    ])

    const allExpenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
    const categories = catSnap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() } as Category))
    const recurring = recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RecurringExpense))

    const bounds = getPeriodBounds(period)
    const prevBounds = getPreviousPeriodBounds(period)

    const currentExpenses = allExpenses.filter((e) => e.date >= bounds.start && e.date <= bounds.end)
    const prevExpenses = allExpenses.filter((e) => e.date >= prevBounds.start && e.date <= prevBounds.end)

    const totalUsd = sumByCurrency(currentExpenses, Currency.USD)
    const totalUyu = sumByCurrency(currentExpenses, Currency.UYU)
    const previousPeriodUsd = sumByCurrency(prevExpenses, Currency.USD)
    const previousPeriodUyu = sumByCurrency(prevExpenses, Currency.UYU)

    // Fixed costs = active recurring expenses (by amount × currency).
    // Only count monthly items toward the monthly fixed cost;
    // annual items are divided by 12 for a monthly equivalent.
    const activeRecurring = recurring.filter((r) => r.status === RecurringStatus.Active)
    const fixedUsd = activeRecurring
      .filter((r) => r.currency === Currency.USD)
      .reduce((s, r) => {
        const freq = r.frequency ?? RecurringFrequency.Monthly
        return s + (freq === RecurringFrequency.Annual ? r.amount / 12 : r.amount)
      }, 0)
    const fixedUyu = activeRecurring
      .filter((r) => r.currency === Currency.UYU)
      .reduce((s, r) => {
        const freq = r.frequency ?? RecurringFrequency.Monthly
        return s + (freq === RecurringFrequency.Annual ? r.amount / 12 : r.amount)
      }, 0)

    // Monthly history — last 6 months
    const now = new Date()
    const monthlyHistory = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const prefix = `${y}-${String(mo).padStart(2, '0')}`
      const monthExpenses = allExpenses.filter((e) => e.date.startsWith(prefix))
      return {
        month: mo,
        year: y,
        label: MONTH_SHORT[mo - 1] as string,
        usd: sumByCurrency(monthExpenses, Currency.USD),
        uyu: sumByCurrency(monthExpenses, Currency.UYU),
      }
    })

    // By category
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const catTotals = new Map<string, { usd: number; uyu: number }>()
    for (const exp of currentExpenses) {
      for (const cid of exp.categoryIds) {
        const cur = catTotals.get(cid) ?? { usd: 0, uyu: 0 }
        if (exp.currency === Currency.USD) cur.usd += exp.amount
        else cur.uyu += exp.amount
        catTotals.set(cid, cur)
      }
    }
    const byCategory = Array.from(catTotals.entries())
      .map(([categoryId, totals]) => {
        const cat = catMap.get(categoryId)
        return {
          categoryId,
          categoryName: cat?.name ?? categoryId,
          categoryIcon: cat?.icon ?? '🏷',
          usd: totals.usd,
          uyu: totals.uyu,
        }
      })
      .sort((a, b) => (b.usd + b.uyu / 100) - (a.usd + a.uyu / 100))

    // Previous period by category
    const prevCatTotals = new Map<string, { usd: number; uyu: number }>()
    for (const exp of prevExpenses) {
      for (const cid of exp.categoryIds) {
        const cur = prevCatTotals.get(cid) ?? { usd: 0, uyu: 0 }
        if (exp.currency === Currency.USD) cur.usd += exp.amount
        else cur.uyu += exp.amount
        prevCatTotals.set(cid, cur)
      }
    }
    const previousByCategory = Array.from(prevCatTotals.entries()).map(([categoryId, totals]) => {
      const cat = catMap.get(categoryId)
      return {
        categoryId,
        categoryName: cat?.name ?? categoryId,
        categoryIcon: cat?.icon ?? '🏷',
        usd: totals.usd,
        uyu: totals.uyu,
      }
    })

    // Fixed breakdown — active recurring.
    // Default frequency to Monthly for records created before the field was added.
    const fixedBreakdown = activeRecurring.map((r) => ({
      recurringId: r.id,
      name: r.name,
      icon: r.icon,
      mode: r.mode,
      amount: r.amount,
      currency: r.currency,
      frequency: r.frequency ?? RecurringFrequency.Monthly,
    }))

    return {
      period,
      totalUsd,
      totalUyu,
      previousPeriodUsd,
      previousPeriodUyu,
      variableUsd: totalUsd,
      variableUyu: totalUyu,
      fixedUsd,
      fixedUyu,
      monthlyHistory,
      byCategory,
      previousByCategory,
      fixedBreakdown,
    }
  },
}
