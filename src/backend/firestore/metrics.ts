// src/backend/firestore/metrics.ts
// Metrics computed client-side from Firestore expenses, categories, and recurring data.

import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import { PeriodFilter, Currency, RecurringFrequency, RecurringStatus } from '@/types/enums'
import type { IMetricsBackend, MetricsSummary, MetricsPeriod as MPeriod } from '../types'
import type { Expense, Category, RecurringExpense, Product, ProductCategory } from "@/types/models"

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0] as string
}

function getYearMonthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number) as [number, number]
  const last = new Date(y, m, 0).getDate()
  return { start: `${yearMonth}-01`, end: `${yearMonth}-${String(last).padStart(2, '0')}` }
}

function getPeriodBounds(period: MPeriod): { start: string; end: string } {
  const now = new Date()
  const today = isoDate(now)
  if (period === PeriodFilter.SevenDays) {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return { start: isoDate(d), end: today }
  }
  if (period === PeriodFilter.Month) {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return { start: `${y}-${m}-01`, end: today }
  }
  if (period === PeriodFilter.ThreeMonths) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    return { start: isoDate(d), end: today }
  }
  // Year
  return { start: `${now.getFullYear()}-01-01`, end: today }
}

function getPreviousPeriodBounds(period: MPeriod): { start: string; end: string } {
  const now = new Date()
  if (period === PeriodFilter.SevenDays) {
    const end = new Date(now)
    end.setDate(end.getDate() - 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    return { start: isoDate(start), end: isoDate(end) }
  }
  if (period === PeriodFilter.Month) {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: isoDate(first), end: isoDate(last) }
  }
  if (period === PeriodFilter.ThreeMonths) {
    const end = new Date(now)
    end.setMonth(end.getMonth() - 3)
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
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
  async getSummary(period: MPeriod, yearMonth?: string): Promise<MetricsSummary> {
    const uid = requireUid()

    // Fetch all expenses, categories, recurring, and products in parallel
    const [expSnap, catSnap, recSnap, prodSnap, pCatSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'users', uid, 'expenses'), orderBy('date', 'desc'))),
      getDocs(query(collection(firestore, 'users', uid, 'categories'), orderBy('name', 'asc'))),
      getDocs(query(collection(firestore, 'users', uid, 'recurring'), orderBy('name', 'asc'))),
      getDocs(collection(firestore, 'users', uid, 'products')),
      getDocs(collection(firestore, 'users', uid, 'productCategories')),
    ])

    const allExpenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)
    const categories = catSnap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() }) as Category)
    const recurring = recSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringExpense)
    const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
    const productCategories = pCatSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductCategory)

    const bounds = yearMonth ? getYearMonthBounds(yearMonth) : getPeriodBounds(period)
    const prevBounds = getPreviousPeriodBounds(period)

    const currentExpenses = allExpenses.filter(
      (e) => e.date >= bounds.start && e.date <= bounds.end
    )
    const prevExpenses = allExpenses.filter(
      (e) => e.date >= prevBounds.start && e.date <= prevBounds.end
    )

    const totalUsd = sumByCurrency(currentExpenses, Currency.USD)
    const totalUyu = sumByCurrency(currentExpenses, Currency.UYU)
    const previousPeriodUsd = sumByCurrency(prevExpenses, Currency.USD)
    const previousPeriodUyu = sumByCurrency(prevExpenses, Currency.UYU)

    // Fixed costs = active recurring expenses (by amount × currency).
    // Only count monthly items toward the monthly fixed cost;
    const activeRecurring = recurring.filter((r) => r.status === RecurringStatus.Active)
    const fixedUsd = activeRecurring
      .filter((r) => r.currency === Currency.USD)
      .filter(r => r.frequency === RecurringFrequency.Monthly)
      .reduce((s, r) => s + r.amount
        , 0)
    const fixedUyu = activeRecurring
      .filter((r) => r.currency === Currency.UYU)
      .filter(r => r.frequency === RecurringFrequency.Monthly)
      .reduce((s, r) => s + r.amount
        , 0)

    // Monthly history — last 6 months
    const now = new Date()
    const monthlyHistory = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const prefix = `${y}-${String(mo).padStart(2, '0')}`
      const monthExpenses = allExpenses.filter((e) => e.date.startsWith(prefix))
      const varUsdMonth = sumByCurrency(monthExpenses, Currency.USD)
      const varUyuMonth = sumByCurrency(monthExpenses, Currency.UYU)
      const totalUsdMonth = varUsdMonth + fixedUsd
      const totalUyuMonth = varUyuMonth + fixedUyu
      return {
        month: mo,
        year: y,
        label: MONTH_SHORT[mo - 1] as string,
        usd: totalUsdMonth,
        uyu: totalUyuMonth,
        fixedUsd: fixedUsd,
        fixedUyu: fixedUyu,
        variableUsd: varUsdMonth,
        variableUyu: varUyuMonth,
      }
    })

    // By category
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const catTotals = new Map<string, { usd: number; uyu: number; expenseCount: number }>()
    for (const exp of currentExpenses) {
      for (const cid of exp.categoryIds) {
        const cur = catTotals.get(cid) ?? { usd: 0, uyu: 0, expenseCount: 0 }
        if (exp.currency === Currency.USD) cur.usd += exp.amount
        else cur.uyu += exp.amount
        cur.expenseCount += 1
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
          expenseCount: totals.expenseCount,
        }
      })
      .sort((a, b) => b.usd + b.uyu / 100 - (a.usd + a.uyu / 100))

    // Previous period by category
    const prevCatTotals = new Map<string, { usd: number; uyu: number; expenseCount: number }>()
    for (const exp of prevExpenses) {
      for (const cid of exp.categoryIds) {
        const cur = prevCatTotals.get(cid) ?? { usd: 0, uyu: 0, expenseCount: 0 }
        if (exp.currency === Currency.USD) cur.usd += exp.amount
        else cur.uyu += exp.amount
        cur.expenseCount += 1
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
        expenseCount: totals.expenseCount,
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

    // By product category — aggregate ticketLines → product → productCategoryId
    const prodMap = new Map(products.map((p) => [p.id, p]))
    const pCatMap = new Map(productCategories.map((pc) => [pc.id, pc]))
    const byProdCatMap = new Map<string, { usd: number; uyu: number }>()
    for (const exp of currentExpenses) {
      for (const line of (exp.ticketLines ?? [])) {
        if (!line.productId) continue
        const prod = prodMap.get(line.productId)
        if (!prod?.productCategoryId) continue
        const entry = byProdCatMap.get(prod.productCategoryId) ?? { usd: 0, uyu: 0 }
        if (exp.currency === Currency.USD) entry.usd += line.amount
        else entry.uyu += line.amount
        byProdCatMap.set(prod.productCategoryId, entry)
      }
    }
    const byProductCategory = [...byProdCatMap.entries()]
      .map(([pcId, totals]) => {
        const pc = pCatMap.get(pcId)
        return {
          productCategoryId: pcId,
          productCategoryName: pc?.name ?? pcId,
          productCategoryIcon: pc?.icon ?? '📦',
          usd: totals.usd,
          uyu: totals.uyu,
        }
      })
      .sort((a, b) => (b.usd + b.uyu) - (a.usd + a.uyu))

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
      byProductCategory,
    }
  },
}
