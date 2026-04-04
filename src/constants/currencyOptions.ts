import { Currency } from '@/types/enums'

export interface CurrencyOption {
  value: Currency | ''
  label: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: '', label: 'Todas' },
  { value: Currency.USD, label: 'USD' },
  { value: Currency.UYU, label: 'UYU' },
]
