// src/tests/utils/formatCurrency.test.ts

import { describe, it, expect } from 'vitest'
import { formatCurrency, formatAmount } from '@/utils/formatCurrency'
import { Currency } from '@/types/enums'

describe('formatCurrency', () => {
  it('formats USD with 2 decimal places', () => {
    const result = formatCurrency(12.9, Currency.USD)
    expect(result).toContain('12.90')
    expect(result).toContain('$')
  })

  it('formats UYU without decimal places', () => {
    const result = formatCurrency(2400, Currency.UYU)
    expect(result).toContain('2.400') // UY locale uses dots
  })
})

describe('formatAmount', () => {
  it('compacts large UYU amounts', () => {
    expect(formatAmount(24800, Currency.UYU)).toBe('$24.8k')
  })

  it('does not compact small UYU amounts', () => {
    const result = formatAmount(890, Currency.UYU)
    expect(result).not.toContain('k')
  })

  it('formats USD normally regardless of amount', () => {
    const result = formatAmount(1234.56, Currency.USD)
    expect(result).toContain('1,234.56')
  })
})
