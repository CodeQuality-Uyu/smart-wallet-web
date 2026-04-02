// src/backend/types.ts
// Shared interfaces for all backend implementations (msw, firestore, aws)

import type {
  Card, CreateCardPayload,
  Category, CreateCategoryPayload, UpdateCategoryPayload,
  GlobalPlace, Place, CreatePlacePayload, UpdatePlacePayload,
  RecurringExpense, CreateRecurringPayload, UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload, RecurringPaymentHistory,
  Expense, CreateExpensePayload, UpdateExpensePayload,
  TicketLine, PaginatedResponse, ExpenseFilters,
  MetricsSummary, BudgetSettings,
  MonthClosing, CreateMonthClosingPayload,
  ProductCategory, CreateProductCategoryPayload, UpdateProductCategoryPayload,
  Brand, CreateBrandPayload, UpdateBrandPayload,
  GlobalProduct, GlobalProductSuggestion,
  Product, CreateProductPayload, UpdateProductPayload,
  ProductPriceRecord, CreateProductPriceRecordPayload,
} from '@/types/models'
import type { Currency, MetricsPeriod, RecurringStatus } from '@/types/enums'

export type {
  Card, CreateCardPayload,
  Category, CreateCategoryPayload, UpdateCategoryPayload,
  GlobalPlace, Place, CreatePlacePayload, UpdatePlacePayload,
  RecurringExpense, CreateRecurringPayload, UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload, RecurringPaymentHistory,
  RecurringStatus,
  Expense, CreateExpensePayload, UpdateExpensePayload,
  TicketLine, PaginatedResponse, ExpenseFilters,
  MetricsSummary, MetricsPeriod,
  MonthClosing, CreateMonthClosingPayload,
  ProductCategory, CreateProductCategoryPayload, UpdateProductCategoryPayload,
  Brand, CreateBrandPayload, UpdateBrandPayload,
  GlobalProduct, GlobalProductSuggestion,
  Product, CreateProductPayload, UpdateProductPayload,
  ProductPriceRecord, CreateProductPriceRecordPayload,
}

// ─── Auth ──────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: SessionUser
}

/**
 * login returns:
 *  - { authenticated: true, token, user } → session started, navigate to /home
 *  - { authenticated: false }             → email link/code sent, navigate to /verify-code
 */
export type LoginResult =
  | { authenticated: true; token: string; user: SessionUser }
  | { authenticated: false }

export interface IAuthBackend {
  login(email: string, password: string): Promise<LoginResult>
  register(name: string, email: string, password: string): Promise<void>
  verifyCode(email: string, code: string): Promise<AuthResponse>
  resetPassword(email: string): Promise<void>
}

// ─── Cards / Payment methods ──────────────────────────────

export interface ICardsBackend {
  list(): Promise<Card[]>
  create(payload: CreateCardPayload): Promise<Card>
  remove(id: string): Promise<void>
}

// ─── Categories ───────────────────────────────────────────

export interface ICategoriesBackend {
  list(): Promise<Category[]>
  create(payload: CreateCategoryPayload): Promise<Category>
  update(id: string, payload: UpdateCategoryPayload): Promise<Category>
  remove(id: string): Promise<void>
}

// ─── Places / Locales ─────────────────────────────────────

export interface IPlacesBackend {
  list(): Promise<Place[]>
  searchGlobal(query: string): Promise<GlobalPlace[]>
  create(payload: CreatePlacePayload): Promise<Place>
  update(id: string, payload: UpdatePlacePayload): Promise<Place>
  remove(id: string): Promise<void>
}

// ─── Recurring expenses ───────────────────────────────────

export interface IRecurringBackend {
  list(): Promise<RecurringExpense[]>
  getById(id: string): Promise<RecurringExpense>
  create(payload: CreateRecurringPayload): Promise<RecurringExpense>
  update(id: string, payload: UpdateRecurringPayload): Promise<RecurringExpense>
  remove(id: string): Promise<void>
  setStatus(id: string, status: RecurringStatus): Promise<RecurringExpense>
  confirmPayment(id: string, payload: ConfirmRecurringPaymentPayload): Promise<RecurringPaymentHistory>
}

// ─── Expenses ─────────────────────────────────────────────

export interface IExpensesBackend {
  list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>>
  getById(id: string): Promise<Expense>
  create(payload: CreateExpensePayload): Promise<Expense>
  update(id: string, payload: UpdateExpensePayload): Promise<Expense>
  remove(id: string): Promise<void>
  duplicate(id: string): Promise<Expense>
  uploadReceipt(id: string, file: File): Promise<{ receiptUrl: string }>
  addTicketLine(expenseId: string, line: Omit<TicketLine, 'id'>): Promise<TicketLine>
  removeTicketLine(expenseId: string, lineId: string): Promise<void>
}

// ─── Metrics ──────────────────────────────────────────────

export interface IMetricsBackend {
  getSummary(period: MetricsPeriod, yearMonth?: string): Promise<MetricsSummary>
}

// ─── Month closings ───────────────────────────────────────

export interface IMonthClosingsBackend {
  list(): Promise<MonthClosing[]>
  getById(id: string): Promise<MonthClosing | null>
  create(payload: CreateMonthClosingPayload): Promise<MonthClosing>
}

// ─── Budget ───────────────────────────────────────────────

export interface IBudgetBackend {
  get(): Promise<BudgetSettings>
  set(settings: BudgetSettings): Promise<BudgetSettings>
}

// ─── Salaries ─────────────────────────────────────────────

export interface Salary {
  id: string
  amount: number
  currency: string
  date: string
  notes: string
  createdAt: string
}

export interface CreateSalaryPayload {
  amount: number
  currency: string
  date: string
  notes: string
}

export interface ISalariesBackend {
  list(): Promise<Salary[]>
  create(payload: CreateSalaryPayload): Promise<Salary>
  remove(id: string): Promise<void>
}

// ─── Product categories ────────────────────────────────────

export interface IProductCategoriesBackend {
  list(): Promise<ProductCategory[]>
  create(payload: CreateProductCategoryPayload): Promise<ProductCategory>
  update(id: string, payload: UpdateProductCategoryPayload): Promise<ProductCategory>
  remove(id: string): Promise<void>
}

// ─── Brands ───────────────────────────────────────────────

export interface IBrandsBackend {
  list(): Promise<Brand[]>
  search(query: string): Promise<Brand[]>
  create(payload: CreateBrandPayload): Promise<Brand>
  update(id: string, payload: UpdateBrandPayload): Promise<Brand>
  remove(id: string): Promise<void>
}

// ─── Products ─────────────────────────────────────────────

export interface ProductsFilter {
  search?: string
  categoryId?: string
  brandId?: string
}

export interface PriceByPlace {
  placeId: string
  placeName: string
  unitPrice: number
  currency: Currency
  recordedAt: string
  diffPct: number
}

export interface IProductsBackend {
  list(filters?: ProductsFilter): Promise<Product[]>
  getById(id: string): Promise<Product>
  searchGlobal(query: string): Promise<GlobalProductSuggestion[]>
  create(payload: CreateProductPayload): Promise<Product>
  update(id: string, payload: UpdateProductPayload): Promise<Product>
  remove(id: string): Promise<void>
  getPriceHistory(globalProductId: string): Promise<ProductPriceRecord[]>
  getPriceByPlace(globalProductId: string): Promise<PriceByPlace[]>
  addPriceRecord(payload: CreateProductPriceRecordPayload): Promise<ProductPriceRecord>
}
