// src/pages/HomePage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { groupExpensesByDate } from '@/utils/groupByDate'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency, RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './HomePage.module.css'

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']


export default function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: metrics, isLoading: loadingMetrics, error: metricsError, refetch } = useMetrics(MetricsPeriod.Month)
  const { data: budget, isLoading: loadingBudget } = useBudget()
  const { data: expensesPage, isLoading: loadingExpenses } = useExpenses()
  const { data: categories = [], isLoading: loadingCategories } = useCategories()
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()

  if (loadingMetrics || loadingBudget || loadingExpenses || loadingCategories || loadingRecurring) {
    return <LoadingSpinner fullPage />
  }
  if (metricsError || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`

  // ── Average from previous 5 months ────────────────────────
  const prevMonths = metrics.monthlyHistory.slice(0, -1)
  const avgUsd = prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.usd, 0) / prevMonths.length : 0
  const avgUyu = prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.uyu, 0) / prevMonths.length : 0
  const vsAvgUsd = avgUsd > 0 ? Math.round(((metrics.totalUsd - avgUsd) / avgUsd) * 100) : 0
  const vsAvgUyu = avgUyu > 0 ? Math.round(((metrics.totalUyu - avgUyu) / avgUyu) * 100) : 0

  // ── vs previous month ─────────────────────────────────────
  const usdDeltaPct = metrics.previousPeriodUsd > 0
    ? Math.round(((metrics.totalUsd - metrics.previousPeriodUsd) / metrics.previousPeriodUsd) * 100)
    : 0
  const uyuDeltaPct = metrics.previousPeriodUyu > 0
    ? Math.round(((metrics.totalUyu - metrics.previousPeriodUyu) / metrics.previousPeriodUyu) * 100)
    : 0

  // ── Budget usage ──────────────────────────────────────────
  const budgetUsdPct = budget?.usd ? Math.min(Math.round((metrics.totalUsd / budget.usd) * 100), 999) : null
  const budgetUyuPct = budget?.uyu ? Math.min(Math.round((metrics.totalUyu / budget.uyu) * 100), 999) : null

  // ── Category growth (top 3 by delta %) ───────────────────
  const categoryGrowth = metrics.byCategory
    .map((cat) => {
      const prev = metrics.previousByCategory.find((p) => p.categoryId === cat.categoryId)
      const prevVal = (prev?.usd ?? 0) + (prev?.uyu ?? 0) / 100
      const curVal = cat.usd + cat.uyu / 100
      const delta = prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : (curVal > 0 ? 100 : 0)
      return { ...cat, delta, curVal }
    })
    .filter((c) => c.curVal > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  // ── Upcoming / pending recurring ─────────────────────────
  const pendingRecurring = recurring.filter(
    (r) => r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending,
  )

  // ── Recent expenses ───────────────────────────────────────
  const expenses = expensesPage?.data ?? []
  const groups = groupExpensesByDate(expenses).slice(0, 2)

  const spendCards = [
    { currency: Currency.USD, total: metrics.totalUsd, prev: metrics.previousPeriodUsd, deltaPct: usdDeltaPct, budgetPct: budgetUsdPct, budget: budget?.usd, flag: '🇺🇸', label: 'USD' },
    { currency: Currency.UYU, total: metrics.totalUyu, prev: metrics.previousPeriodUyu, deltaPct: uyuDeltaPct, budgetPct: budgetUyuPct, budget: budget?.uyu, flag: '🇺🇾', label: 'UYU' },
  ]

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.greeting}>Buenos días,</p>
            <p className={styles.name}>{user?.name ?? 'Usuario'} 👋</p>
          </div>
          <div className={styles.avatar} aria-hidden>
            {user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() ?? '??'}
          </div>
        </div>

        <p className={styles.monthLabel}>📅 {monthLabel}</p>

        {/* Spend cards */}
        <div className={styles.spendCards}>
          {spendCards.map(({ currency, total, deltaPct, budgetPct, budget: bgt, flag, label }) => (
            <div key={currency} className={styles.spendCard}>
              <div className={styles.spendCardTop}>
                <span className={styles.spendFlag}>{flag}</span>
                {deltaPct !== 0 && (
                  <span className={[styles.delta, deltaPct > 0 ? styles.deltaUp : styles.deltaDown].join(' ')}>
                    {deltaPct > 0 ? '↑' : '↓'}{Math.abs(deltaPct)}%
                  </span>
                )}
              </div>
              <p className={styles.spendAmount}>{formatAmount(total, currency)}</p>
              <p className={styles.spendLabel}>{label} este mes</p>
              {budgetPct !== null && bgt !== undefined && (
                <div className={styles.budgetBar}>
                  <div
                    className={[styles.budgetFill, budgetPct >= 90 ? styles.budgetDanger : budgetPct >= 70 ? styles.budgetWarn : styles.budgetOk].join(' ')}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              )}
              {budgetPct !== null && (
                <p className={styles.budgetLabel}>{budgetPct}% de {formatCurrency(bgt!, currency)}</p>
              )}
            </div>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {/* ── Categorías que más cambiaron ── */}
        {categoryGrowth.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Categorías destacadas</h2>
            <div className={styles.card}>
              {categoryGrowth.map((cat) => (
                <div key={cat.categoryId} className={styles.catRow}>
                  <span className={styles.catIcon}>{cat.categoryIcon}</span>
                  <span className={styles.catName}>{cat.categoryName}</span>
                  <span className={[styles.catDelta, cat.delta > 0 ? styles.deltaUp : styles.deltaDown].join(' ')}>
                    {cat.delta > 0 ? '↑' : '↓'}{Math.abs(cat.delta)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pagos pendientes ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pagos pendientes</h2>
          {pendingRecurring.length === 0 ? (
            <div className={[styles.card, styles.allPaidMsg].join(' ')}>
              <span>✅</span>
              <span>Todos los pagos del mes están al día</span>
            </div>
          ) : (
            <div className={styles.card}>
              {pendingRecurring.map((r) => (
                <button
                  key={r.id}
                  className={styles.recurringRow}
                  onClick={() => navigate(`/settings/recurring/${r.id}`)}
                >
                  <span className={styles.recurringIcon}>{r.icon}</span>
                  <div className={styles.recurringInfo}>
                    <span className={styles.recurringName}>{r.name}</span>
                    {r.dueDayOfMonth && (
                      <span className={styles.recurringDue}>Vence el día {r.dueDayOfMonth}</span>
                    )}
                  </div>
                  <span className={styles.recurringAmt}>{formatCurrency(r.amount, r.currency)} {r.currency}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Gastos recientes ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Gastos recientes</h2>
            <button className={styles.seeAll} onClick={() => navigate('/expenses')}>Ver todos →</button>
          </div>
          {groups.length === 0 ? (
            <p className={styles.empty}>No hay gastos este mes.</p>
          ) : (
            groups.map((group) => (
              <div key={group.date}>
                <p className={styles.dateHeader}>{group.label}</p>
                {group.expenses.slice(0, 4).map((expense) => (
                  <ExpenseListItem key={expense.id} expense={expense} categories={categories} />
                ))}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
