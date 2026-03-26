// src/utils/formatCurrency.ts

import { Currency } from '@/types/enums'

export function formatCurrency(amount: number, currency: Currency): string {
  const locale = currency === Currency.USD ? 'en-US' : 'es-UY'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === Currency.USD ? 2 : 0,
    maximumFractionDigits: currency === Currency.USD ? 2 : 0,
  }).format(amount)
}

export function formatAmount(amount: number, currency: Currency): string {
  // Compact format for large UYU amounts: 24800 → "$24.8k"
  if (currency === Currency.UYU && amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`
  }
  return formatCurrency(amount, currency)
}
