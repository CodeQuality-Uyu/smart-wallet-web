// src/types/enums/index.ts
// All application enums — never use string unions for domain concepts

export enum GroupBy {
  Day = 'day',
  Week = 'week',
  Place = 'place',
  Category = 'category',
}

export enum Currency {
  USD = 'USD',
  UYU = 'UYU',
}

export enum PaymentType {
  Transfer = 'transfer',
  CreditItau = 'credit_itau',
  DebitItau = 'debit_itau',
  CreditSantander = 'credit_santander',
  DebitSantander = 'debit_santander',
}

export enum CardType {
  Credit = 'credit',
  Debit = 'debit',
}

export enum RecurringMode {
  Auto = 'auto',
  Manual = 'manual',
}

export enum RecurringFrequency {
  Monthly = 'monthly',
  Bimonthly = 'bimonthly',
  Quarterly = 'quarterly',
  Biannual = 'biannual',
  Annual = 'annual',
}

export enum RecurringStatus {
  Active = 'active',
  Paused = 'paused',
}

export enum RecurringPaymentStatus {
  Paid = 'paid',
  Pending = 'pending',
  NotDue = 'not_due',
  Skipped = 'skipped',
}

export enum LocaleFilterPeriod {
  SevenDays = '7d',
  CurrentMonth = 'month',
  CurrentYear = 'year',
  AllTime = 'all',
}

export enum PeriodFilter {
  SevenDays = '7d',
  Month = 'month',
  LastMonth = 'lastMonth',
  ThreeMonths = '3m',
  SixMonths = '6m',
  Year = 'year',
  All = 'all',
}

export enum AppEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}

export enum ProductPricingType {
  Fixed = 'fixed',
  ByWeight = 'by_weight',
}

export enum WeightUnit {
  Kg = 'kg',
  G = 'g',
  L = 'l',
  Ml = 'ml',
}

export enum PriceDataConfidence {
  Fresh = 'fresh',
  Stale = 'stale',
  Old = 'old',
}

export enum NotificationType {
  Expense = 'expense',
  BudgetAlert = 'budget_alert',
  Income = 'income',
  WeeklySummary = 'weekly_summary',
  Recurring = 'recurring',
}

export enum SavingsGoalStatus {
  InProgress = 'in_progress',
  Completed = 'completed',
  AtRisk = 'at_risk',
}

export enum StatementImportAction {
  Import = 'import',
  Skip = 'skip',
}

// ─── Visualizadores del inicio (widgets) ──────────────────
// Motor del widget: guiado (sobre MetricsSummary) o query (motor libre, fase 2).
export enum WidgetEngine {
  Guided = 'guided',
  Query = 'query',
}

// Ancho del widget en la grilla.
export enum WidgetSize {
  Sm = 'sm', // 1 columna
  Md = 'md', // 2 columnas
  Lg = 'lg', // 3 columnas (ancho completo)
}

// Fuente de dato del motor guiado — todo derivable de MetricsSummary (+ budget/recurring).
export enum GuidedSource {
  TotalSpent = 'total_spent',
  CategorySpent = 'category_spent',
  BudgetRemaining = 'budget_remaining',
  RecurringTotal = 'recurring_total',
  FixedTotal = 'fixed_total',
  VariableTotal = 'variable_total',
}

// Cómo se dibuja el valor principal de un bloque guiado.
export enum GuidedPrimaryDisplay {
  Number = 'number',
  Sparkline = 'sparkline',
}

// Referencia contra la que se compara un bloque.
export enum WidgetComparisonType {
  PreviousPeriod = 'previous_period',
  Budget = 'budget',
  Target = 'target',
}

// Cómo se renderiza una comparación.
export enum WidgetComparisonRender {
  Delta = 'delta', // ↑/↓ % o valor
  Progress = 'progress', // barra de progreso
}

// ─── Motor query (widget flexible sobre gastos) ───────────
export enum QueryGroupBy {
  None = 'none',
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Category = 'category',
  /** Categoría raíz: las subcategorías se acumulan bajo su padre. */
  CategoryRoot = 'category_root',
  Place = 'place',
  Card = 'card',
}

export enum QueryAggregate {
  Sum = 'sum',
  Count = 'count',
  Avg = 'avg',
  Min = 'min',
  Max = 'max',
}

export enum QueryDisplay {
  Value = 'value',
  ValueDelta = 'value_delta',
  Table = 'table',
  Bar = 'bar',
  Line = 'line',
  Area = 'area',
  Pie = 'pie',
}

export enum ReceiptStatus {
  Pending = 'pending',
  Done = 'done',
  Failed = 'failed',
}

// Formato de salida de un "recorte" (indicador de recorte dinámico definido por el usuario).
export enum RecorteOutputFormat {
  Amount = 'amount', // un monto/número destacado (KPI)
  Text = 'text', // un párrafo de análisis en lenguaje natural
  List = 'list', // lista de ítems/hallazgos
  Badge = 'badge', // semáforo de estado (bien / atención / alerta)
}

// Nivel del semáforo para un recorte con outputFormat = Badge.
export enum RecorteBadgeLevel {
  Good = 'good',
  Warning = 'warning',
  Alert = 'alert',
}
