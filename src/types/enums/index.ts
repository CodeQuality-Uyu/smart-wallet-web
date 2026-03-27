// src/types/enums/index.ts
// All application enums — never use string unions for domain concepts

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
  Transfer = 'transfer',
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

export enum ExpenseFilterPeriod {
  SevenDays = '7d',
  Month = 'month',
  ThreeMonths = '3m',
  Year = 'year',
}

export enum LocaleFilterPeriod {
  SevenDays = '7d',
  CurrentMonth = 'month',
  CurrentYear = 'year',
  AllTime = 'all',
}

export enum MetricsPeriod {
  SevenDays = '7d',
  Month = 'month',
  Year = 'year',
}

export enum AppEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}
