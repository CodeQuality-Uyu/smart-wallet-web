// src/types/models/index.ts

import {
  Currency,
  CardType,
  RecurringMode,
  RecurringFrequency,
  RecurringStatus,
  RecurringPaymentStatus,
} from '@/types/enums'

// ─── Shared ───────────────────────────────────────────────

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Category ─────────────────────────────────────────────

export interface Category extends Timestamps {
  id: string
  name: string
  icon: string
  color?: string
  active: boolean
}

export type CreateCategoryPayload = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

// ─── Place / Locale ────────────────────────────────────────

export interface GlobalPlace {
  id: string
  name: string
  address?: string
  icon?: string
  nameLower: string
  createdAt: string
}

export interface Place extends Timestamps {
  id: string
  name: string
  address?: string
  icon?: string
  visitCount: number
  active: boolean
  globalPlaceId?: string
}

export interface CreatePlacePayload {
  name: string
  address?: string
  icon?: string
  globalPlaceId?: string
}
export type UpdatePlacePayload = Partial<Pick<Place, 'name' | 'address' | 'icon'>>

// ─── Card / Payment method ────────────────────────────────

export interface Card extends Timestamps {
  id: string
  name: string
  type: CardType
  bank: string
  lastFour?: string
  active?: boolean
}

export type CreateCardPayload = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'active'>

// ─── Expense ──────────────────────────────────────────────

export interface TicketLine {
  id: string
  name: string
  amount: number
}

export interface Expense extends Timestamps {
  id: string
  description: string
  amount: number
  currency: Currency
  cardId: string
  categoryIds: string[]
  placeId?: string
  date: string
  receiptUrl?: string
  ticketLines: TicketLine[]
}

export type CreateExpensePayload = Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'ticketLines'>
export type UpdateExpensePayload = Partial<CreateExpensePayload>

export interface ExpenseFilters {
  period?: string
  categoryIds?: string[]
  currency?: Currency
  cardId?: string
  placeId?: string
  search?: string
  groupBy?: 'day' | 'week' | 'place' | 'category'
}

// ─── Recurring expense ────────────────────────────────────

export interface RecurringPaymentHistory {
  id: string
  month: number
  year: number
  amount: number
  currency: Currency
  paidAt?: string
  receiptUrl?: string
  status: RecurringPaymentStatus
}

export interface RecurringExpense extends Timestamps {
  id: string
  name: string
  icon: string
  description?: string
  amount: number
  currency: Currency
  categoryId: string
  cardId: string
  mode: RecurringMode
  frequency: RecurringFrequency
  status: RecurringStatus
  dueDayOfMonth?: number // only for manual
  paymentHistory: RecurringPaymentHistory[]
  currentMonthStatus?: RecurringPaymentStatus
}

export type CreateRecurringPayload = Omit<
  RecurringExpense,
  'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'currentMonthStatus'
>
export type UpdateRecurringPayload = Partial<CreateRecurringPayload>

export interface ConfirmRecurringPaymentPayload {
  amount: number
  receiptFile?: File
}

// ─── Metrics ──────────────────────────────────────────────

export interface MonthlySpend {
  month: number
  year: number
  label: string
  usd: number
  uyu: number
}

export interface CategorySpend {
  categoryId: string
  categoryName: string
  categoryIcon: string
  usd: number
  uyu: number
}

export interface FixedExpenseBreakdown {
  recurringId: string
  name: string
  icon: string
  mode: RecurringMode
  amount: number
  currency: Currency
  frequency: RecurringFrequency
}

export interface MetricsSummary {
  period: string
  totalUsd: number
  totalUyu: number
  previousPeriodUsd: number
  previousPeriodUyu: number
  variableUsd: number
  variableUyu: number
  fixedUsd: number
  fixedUyu: number
  monthlyHistory: MonthlySpend[]
  byCategory: CategorySpend[]
  previousByCategory: CategorySpend[]
  fixedBreakdown: FixedExpenseBreakdown[]
}

// ─── Budget ───────────────────────────────────────────────

export interface BudgetSettings {
  usd?: number
  uyu?: number
}

// ─── Month closings ───────────────────────────────────────

export interface MonthClosingRecurring {
  recurringId: string
  name: string
  icon: string
  amount: number
  currency: Currency
  mode: RecurringMode
  frequency: RecurringFrequency
}

export interface MonthClosingCategory {
  categoryId: string
  categoryName: string
  categoryIcon: string
  usd: number
  uyu: number
}

export interface MonthClosing {
  id: string // "{year}-{month:02d}" e.g. "2026-03"
  year: number
  month: number
  closedAt: string
  totalUsd: number
  totalUyu: number
  variableUsd: number
  variableUyu: number
  fixedUsd: number
  fixedUyu: number
  recurringPaid: MonthClosingRecurring[]
  topCategories: MonthClosingCategory[]
}

export type CreateMonthClosingPayload = Omit<MonthClosing, 'closedAt'>

// ─── Auth / User ──────────────────────────────────────────

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface Income {
  id: string
  name: string
  amount: number
  currency: Currency
}
