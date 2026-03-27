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

export interface Place extends Timestamps {
  id: string
  name: string
  address?: string
  visitCount: number
  active: boolean
}

export type CreatePlacePayload = Pick<Place, 'name' | 'address'>
export type UpdatePlacePayload = Partial<CreatePlacePayload>

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
  placeId?: string
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
  fixedBreakdown: FixedExpenseBreakdown[]
}

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
