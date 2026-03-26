// src/pages/HomePage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useMetrics } from '@/hooks/useMetrics'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { groupExpensesByDate } from '@/utils/groupByDate'
import { formatAmount } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency } from '@/types/enums'
import styles from './HomePage.module.css'

export default function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: expensesPage, isLoading: loadingExpenses, error: expError, refetch } = useExpenses()
  const { data: metrics } = useMetrics(MetricsPeriod.Month)
  const { data: categories = [] } = useCategories()

  const expenses = expensesPage?.data ?? []
  const groups = groupExpensesByDate(expenses)

  return (
    <div className={styles.page}>
      {/* ── Header with metrics ── */}
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.greeting}>Buenos días,</p>
            <p className={styles.name}>Martina García 👋</p>
          </div>
          <div className={styles.avatar} aria-hidden>MG</div>
        </div>

        <div className={styles.metrics}>
          {[Currency.USD, Currency.UYU].map((currency) => {
            const total = currency === Currency.USD
              ? (metrics?.totalUsd ?? 0)
              : (metrics?.totalUyu ?? 0)
            const prev = currency === Currency.USD
              ? (metrics?.previousPeriodUsd ?? 0)
              : (metrics?.previousPeriodUyu ?? 0)
            const pct = prev > 0
              ? Math.round(((total - prev) / prev) * 100)
              : 0

            return (
              <div key={currency} className={styles.metricCard}>
                <p className={styles.metricFlag}>{currency === Currency.USD ? '🇺🇸' : '🇺🇾'}</p>
                <p className={styles.metricLabel}>Gastado {currency}</p>
                <p className={styles.metricAmount}>{formatAmount(total, currency)}</p>
                <p className={styles.metricSub}>este mes</p>
                {pct !== 0 && (
                  <span className={[styles.metricDelta, pct > 0 ? styles.up : styles.down].join(' ')}>
                    {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </header>

      {/* ── Recent expenses ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Gastos recientes</h2>
          <button className={styles.seeAll} onClick={() => navigate('/expenses')}>
            Ver todos →
          </button>
        </div>

        {loadingExpenses && <LoadingSpinner />}
        {expError && (
          <ErrorMessage
            message="No se pudieron cargar los gastos."
            onRetry={() => void refetch()}
          />
        )}

        {!loadingExpenses && !expError && groups.length === 0 && (
          <p className={styles.empty}>No hay gastos registrados aún.</p>
        )}

        {groups.slice(0, 3).map((group) => (
          <div key={group.date}>
            <p className={styles.dateHeader}>{group.label}</p>
            {group.expenses.slice(0, 5).map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                categories={categories}
              />
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
