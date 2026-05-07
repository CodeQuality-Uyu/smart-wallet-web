// src/types/models/index.ts

import {
  Currency,
  CardType,
  RecurringMode,
  RecurringFrequency,
  RecurringStatus,
  RecurringPaymentStatus,
  ProductPricingType,
  WeightUnit,
  NotificationType,
  SavingsGoalStatus,
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
  limitUYU?: number
  limitUSD?: number
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
  color?: string
  active?: boolean
}

export type CreateCardPayload = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'active'>

// ─── Expense ──────────────────────────────────────────────

export interface TicketLine {
  id: string
  name: string
  amount: number
  productId?: string
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
  categoryIds: string[]
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
  month?: number
  year?: number
}

export interface UpdateRecurringPaymentPayload {
  amount: number
  paidAt?: string
}

// ─── Metrics ──────────────────────────────────────────────

export interface MonthlySpend {
  month: number
  year: number
  label: string
  usd: number
  uyu: number
  fixedUsd: number
  fixedUyu: number
  variableUsd: number
  variableUyu: number
}

export interface CategorySpend {
  categoryId: string
  categoryName: string
  categoryIcon: string
  usd: number
  uyu: number
  expenseCount: number
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

export interface ProductCategorySpend {
  productCategoryId: string
  productCategoryName: string
  productCategoryIcon: string
  usd: number
  uyu: number
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
  byProductCategory: ProductCategorySpend[]
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

// ─── Product catalog ──────────────────────────────────────

export interface ProductCategory extends Timestamps {
  id: string
  name: string
  icon: string
  color?: string
}

export type CreateProductCategoryPayload = Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProductCategoryPayload = Partial<CreateProductCategoryPayload>

export interface Brand extends Timestamps {
  id: string
  name: string
}

export type CreateBrandPayload = Pick<Brand, 'name'>
export type UpdateBrandPayload = Partial<CreateBrandPayload>

// Global pool: /products/{id} — community data, no categoryId
export interface GlobalProduct {
  id: string
  name: string
  nameLower: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  brandId?: string
  // Denormalized last price info (updated on each addPriceRecord)
  lastPlaceId?: string
  lastUnitPrice?: number
  lastCurrency?: Currency
  lastRecordedAt?: string
  createdAt: string
}

// Suggestion returned by searchGlobal
export interface GlobalProductSuggestion {
  id: string
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  brandId?: string
  brandName?: string
  lastPlaceId?: string
  lastPlaceName?: string
  lastUnitPrice?: number
  lastCurrency?: Currency
  lastRecordedAt?: string
}

// User copy: users/{uid}/products/{id} — personal, links to global via globalProductId
export interface Product extends Timestamps {
  id: string
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  productCategoryId: string
  brandId?: string
  globalProductId: string
  active: boolean
}

export interface CreateProductPayload {
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  productCategoryId: string
  brandId?: string
  globalProductId?: string // if set, links to existing global product (no new global created)
}
export type UpdateProductPayload = Partial<Omit<CreateProductPayload, 'globalProductId'>>

export interface ProductPriceRecord {
  id: string
  productId: string
  placeId: string
  unitPrice: number
  currency: Currency
  recordedAt: string
  expenseId?: string
  lineItemId?: string
  createdAt: string
}

export type CreateProductPriceRecordPayload = Omit<ProductPriceRecord, 'id' | 'createdAt'>

// ─── Savings Goals ───────────────────────────────────

export interface SavingsGoal extends Timestamps {
  id: string
  name: string
  icon: string
  targetAmount: number
  savedAmount: number
  currency: Currency
  targetDate: string
  status: SavingsGoalStatus
  active: boolean
}

export type CreateSavingsGoalPayload = Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'savedAmount' | 'status'>
export type UpdateSavingsGoalPayload = Partial<Omit<CreateSavingsGoalPayload, 'active'>>

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

// ─── Notifications ────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  body: string
  type: NotificationType
  read: boolean
  createdAt: string
}

export interface NotificationAlertPrefs {
  expenses: boolean
  budgetLimit: boolean
  income: boolean
  weeklySummary: boolean
  recurring: boolean
}

export interface NotificationChannelPrefs {
  push: boolean
  email: boolean
  whatsapp: boolean
}

export interface NotificationQuietHours {
  enabled: boolean
  from: string
  to: string
}

export interface NotificationPrefs {
  alerts: NotificationAlertPrefs
  channels: NotificationChannelPrefs
  quietHours: NotificationQuietHours
}

// ─── Report attachments ───────────────────────────────────

export interface ReportAttachment {
  id: string
  yearMonth: string   // "2026-04"
  name: string        // original filename
  url: string         // download URL
  mimeType: string
  size: number        // bytes
  uploadedAt: string
}
