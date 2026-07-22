// src/utils/recurringSchedule.ts
// Pure helpers for recurring-payment scheduling: interval frequencies, cycle
// anchoring (startMonth/startYear), due-month detection, skip/paid lookups and
// overdue computation. Framework-free so it can be used from the backend layer,
// services, pages and MSW handlers alike.

import { RecurringFrequency, RecurringPaymentStatus } from '@/types/enums'
import type { RecurringExpense } from '@/types/models'

/** Number of months between occurrences for each frequency preset. */
export const FREQUENCY_INTERVAL_MONTHS: Record<RecurringFrequency, number> = {
  [RecurringFrequency.Monthly]: 1,
  [RecurringFrequency.Bimonthly]: 2,
  [RecurringFrequency.Quarterly]: 3,
  [RecurringFrequency.Biannual]: 6,
  [RecurringFrequency.Annual]: 12,
}

/** Full label, e.g. "Trimestral". */
export const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  [RecurringFrequency.Monthly]: 'Mensual',
  [RecurringFrequency.Bimonthly]: 'Bimestral',
  [RecurringFrequency.Quarterly]: 'Trimestral',
  [RecurringFrequency.Biannual]: 'Semestral',
  [RecurringFrequency.Annual]: 'Anual',
}

/** Short period noun shown after an amount, e.g. "$/trimestre". */
export const FREQUENCY_PERIOD_LABEL: Record<RecurringFrequency, string> = {
  [RecurringFrequency.Monthly]: 'mes',
  [RecurringFrequency.Bimonthly]: 'bimestre',
  [RecurringFrequency.Quarterly]: 'trimestre',
  [RecurringFrequency.Biannual]: 'semestre',
  [RecurringFrequency.Annual]: 'año',
}

/** Emoji + short label for pickers. */
export const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: RecurringFrequency.Monthly, label: '📅 Mensual' },
  { value: RecurringFrequency.Bimonthly, label: '📅 Bimestral' },
  { value: RecurringFrequency.Quarterly, label: '📆 Trimestral' },
  { value: RecurringFrequency.Biannual, label: '📆 Semestral' },
  { value: RecurringFrequency.Annual, label: '📆 Anual' },
]

/** Interval in months; defaults to monthly for records without a frequency. */
export function intervalMonths(freq?: RecurringFrequency): number {
  return freq ? (FREQUENCY_INTERVAL_MONTHS[freq] ?? 1) : 1
}

export function frequencyLabel(freq?: RecurringFrequency): string {
  return freq ? (FREQUENCY_LABEL[freq] ?? FREQUENCY_LABEL[RecurringFrequency.Monthly]) : FREQUENCY_LABEL[RecurringFrequency.Monthly]
}

export function frequencyPeriodLabel(freq?: RecurringFrequency): string {
  return freq ? (FREQUENCY_PERIOD_LABEL[freq] ?? 'mes') : 'mes'
}

/** Monthly-equivalent amount (amount ÷ interval) — used for aggregated totals. */
export function monthlyEquivalent(rec: Pick<RecurringExpense, 'amount' | 'frequency'>): number {
  return rec.amount / intervalMonths(rec.frequency)
}

interface CycleAnchor {
  month: number // 1-12
  year: number
}

/** The cycle anchor: explicit startMonth/startYear, else the createdAt month. */
export function cycleAnchor(rec: Pick<RecurringExpense, 'startMonth' | 'startYear' | 'createdAt'>): CycleAnchor {
  const created = new Date(rec.createdAt)
  return {
    month: rec.startMonth ?? created.getMonth() + 1,
    year: rec.startYear ?? created.getFullYear(),
  }
}

/** Whether a payment is due in the given month/year given the cycle interval. */
export function isDueMonth(
  rec: Pick<RecurringExpense, 'frequency' | 'startMonth' | 'startYear' | 'createdAt'>,
  month: number,
  year: number,
): boolean {
  const anchor = cycleAnchor(rec)
  const diff = (year - anchor.year) * 12 + (month - anchor.month)
  if (diff < 0) return false
  return diff % intervalMonths(rec.frequency) === 0
}

/** History entry (if any) for the given month/year. */
export function historyFor(
  rec: Pick<RecurringExpense, 'paymentHistory'>,
  month: number,
  year: number,
): RecurringExpense['paymentHistory'][number] | undefined {
  return rec.paymentHistory.find((h) => h.month === month && h.year === year)
}

export function isPaid(rec: Pick<RecurringExpense, 'paymentHistory'>, month: number, year: number): boolean {
  return rec.paymentHistory.some(
    (h) => h.month === month && h.year === year && h.status === RecurringPaymentStatus.Paid,
  )
}

export function isSkipped(rec: Pick<RecurringExpense, 'paymentHistory'>, month: number, year: number): boolean {
  return rec.paymentHistory.some(
    (h) => h.month === month && h.year === year && h.status === RecurringPaymentStatus.Skipped,
  )
}

/** Paid or explicitly skipped — either way it no longer counts as pending. */
export function isSettled(rec: Pick<RecurringExpense, 'paymentHistory'>, month: number, year: number): boolean {
  return isPaid(rec, month, year) || isSkipped(rec, month, year)
}

/**
 * Due months in the recent past that are neither paid nor skipped.
 * Looks back far enough to catch at least one occurrence of the interval,
 * stopping at the record's creation date. Returned newest-first is not
 * guaranteed; callers order as needed.
 */
export function computeOverdueMonths(
  rec: Pick<RecurringExpense, 'frequency' | 'startMonth' | 'startYear' | 'createdAt' | 'paymentHistory'>,
  now: Date = new Date(),
): Array<{ month: number; year: number }> {
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const createdDate = new Date(rec.createdAt)
  const lookback = Math.max(3, intervalMonths(rec.frequency))
  const result: Array<{ month: number; year: number }> = []

  for (let i = 1; i <= lookback; i++) {
    let m = currentMonth - i
    let y = currentYear
    if (m <= 0) {
      m += 12
      y -= 1
    }
    // last day of the checked month — stop once we go before creation
    const checkEnd = new Date(y, m, 0)
    if (checkEnd < createdDate) break
    if (!isDueMonth(rec, m, y)) continue
    if (isSettled(rec, m, y)) continue
    result.push({ month: m, year: y })
  }
  return result
}
