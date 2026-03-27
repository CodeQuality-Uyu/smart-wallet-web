// src/pages/ExpensesPage.tsx

import React, { useState } from 'react'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { groupExpensesByDate } from '@/utils/groupByDate'
import { formatAmount } from '@/utils/formatCurrency'
import { Currency, ExpenseFilterPeriod } from '@/types/enums'
import styles from './ExpensesPage.module.css'

const PERIODS = [
  { value: ExpenseFilterPeriod.SevenDays, label: '7d' },
  { value: ExpenseFilterPeriod.Month, label: 'Este mes' },
  { value: ExpenseFilterPeriod.ThreeMonths, label: '3 meses' },
  { value: ExpenseFilterPeriod.Year, label: 'Año' },
]

export default function ExpensesPage(): React.ReactElement {
  const [period, setPeriod] = useState(ExpenseFilterPeriod.Month)
  const { data: page, isLoading, error, refetch } = useExpenses({ period })
  const { data: categories = [] } = useCategories()

  if (isLoading) return <LoadingSpinner fullPage />

  const expenses = page?.data ?? []
  const groups = groupExpensesByDate(expenses)

  const totalUsd = expenses
    .filter((e) => e.currency === Currency.USD)
    .reduce((s, e) => s + e.amount, 0)

  const totalUyu = expenses
    .filter((e) => e.currency === Currency.UYU)
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className={styles.page}>
      <PageHeader title="Gastos" />

      {/* Period tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Período">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            role="tab"
            aria-selected={period === p.value}
            className={[styles.tab, period === p.value ? styles.tabActive : ''].join(' ')}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Totals */}
      <div className={styles.totals}>
        <div className={styles.totalChip}>
          <p className={styles.totalLabel}>🇺🇸 USD</p>
          <p className={styles.totalAmt}>{formatAmount(totalUsd, Currency.USD)}</p>
        </div>
        <div className={styles.totalChip}>
          <p className={styles.totalLabel}>🇺🇾 UYU</p>
          <p className={styles.totalAmt}>{formatAmount(totalUyu, Currency.UYU)}</p>
        </div>
      </div>

      {error && <ErrorMessage onRetry={() => void refetch()} />}

      {!error && groups.length === 0 && (
        <p className={styles.empty}>No hay gastos en este período.</p>
      )}

      {groups.map((group) => (
        <div key={group.date}>
          <p className={styles.dateHeader}>{group.label}</p>
          {group.expenses.map((expense) => (
            <ExpenseListItem key={expense.id} expense={expense} categories={categories} />
          ))}
        </div>
      ))}
    </div>
  )
}
