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
  ThreeMonths = '3m',
  Year = 'year',
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
