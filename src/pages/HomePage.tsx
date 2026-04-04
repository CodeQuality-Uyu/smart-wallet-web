// src/pages/HomePage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { useCards } from '@/features/cards/hooks/useCards'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { groupExpensesByDate } from '@/utils/groupByDate'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { PeriodFilter, Currency, RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './HomePage.module.css'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  useAuth()
  const {
    data: metrics,
    isLoading: loadingMetrics,
    error: metricsError,
    refetch,
  } = useMetrics(PeriodFilter.Month)
  const { data: budget, isLoading: loadingBudget } = useBudget()
  const { data: expensesPage, isLoading: loadingExpenses } = useExpenses()
  const { data: categories = [], isLoading: loadingCategories } = useCategories()
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()
  const { data: cards = [] } = useCards()

  if (loadingMetrics || loadingBudget || loadingExpenses || loadingCategories || loadingRecurring) {
    return <LoadingSpinner fullPage />
  }
  if (metricsError || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`

  // ── Average from previous 5 months ────────────────────────
  const prevMonths = metrics.monthlyHistory.slice(0, -1)
  const avgUsd =
    prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.usd, 0) / prevMonths.length : 0
  const avgUyu =
    prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.uyu, 0) / prevMonths.length : 0
  const vsAvgUsd = avgUsd > 0 ? Math.round(((metrics.totalUsd - avgUsd) / avgUsd) * 100) : 0
  const vsAvgUyu = avgUyu > 0 ? Math.round(((metrics.totalUyu - avgUyu) / avgUyu) * 100) : 0

  // ── vs previous month ─────────────────────────────────────
  const usdDeltaPct =
    metrics.previousPeriodUsd > 0
      ? Math.round(
          ((metrics.totalUsd - metrics.previousPeriodUsd) / metrics.previousPeriodUsd) * 100
        )
      : 0
  const uyuDeltaPct =
    metrics.previousPeriodUyu > 0
      ? Math.round(
          ((metrics.totalUyu - metrics.previousPeriodUyu) / metrics.previousPeriodUyu) * 100
        )
      : 0

  // ── Budget usage ──────────────────────────────────────────
  const budgetUsdPct = budget?.usd
    ? Math.min(Math.round((metrics.totalUsd / budget.usd) * 100), 999)
    : null
  const budgetUyuPct = budget?.uyu
    ? Math.min(Math.round((metrics.totalUyu / budget.uyu) * 100), 999)
    : null

  // ── Category growth (top 3 by delta %) ───────────────────
  const categoryGrowth = metrics.byCategory
    .map((cat) => {
      const prev = metrics.previousByCategory.find((p) => p.categoryId === cat.categoryId)
      const prevVal = (prev?.usd ?? 0) + (prev?.uyu ?? 0) / 100
      const curVal = cat.usd + cat.uyu / 100
      const delta =
        prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : curVal > 0 ? 100 : 0
      return { ...cat, delta, curVal }
    })
    .filter((c) => c.curVal > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  const catGrandTotalForTips = metrics.byCategory.reduce((s, c) => s + c.usd * 100 + c.uyu, 0)

  // ── Upcoming / pending recurring ─────────────────────────
  const pendingRecurring = recurring.filter(
    (r) =>
      r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending
  )
  // ── Savings tips ──────────────────────────────────────────
  const tips: { icon: string; text: string; type: 'success' | 'warn' | 'info' }[] = []

  // Budget exceeded
  if (budget?.usd && metrics.totalUsd > budget.usd) {
    const over = formatCurrency(metrics.totalUsd - budget.usd, Currency.USD)
    tips.push({
      icon: '⚠️',
      text: `Superaste tu presupuesto USD en ${over} este mes.`,
      type: 'warn',
    })
  } else if (budget?.usd && metrics.totalUsd / budget.usd >= 0.8) {
    const remaining = formatCurrency(budget.usd - metrics.totalUsd, Currency.USD)
    const pct = Math.round((metrics.totalUsd / budget.usd) * 100)
    tips.push({
      icon: '📊',
      text: `Usaste el ${pct}% de tu presupuesto USD. Te quedan ${remaining}.`,
      type: 'warn',
    })
  }
  if (budget?.uyu && metrics.totalUyu > budget.uyu) {
    const over = formatCurrency(metrics.totalUyu - budget.uyu, Currency.UYU)
    tips.push({
      icon: '⚠️',
      text: `Superaste tu presupuesto UYU en ${over} este mes.`,
      type: 'warn',
    })
  }

  // Below historical average
  if (avgUsd > 0 && vsAvgUsd <= -10) {
    tips.push({
      icon: '🎉',
      text: `Estás gastando un ${Math.abs(vsAvgUsd)}% menos que tu promedio histórico en USD. ¡Buen ritmo!`,
      type: 'success',
    })
  } else if (avgUsd > 0 && vsAvgUsd >= 20) {
    tips.push({
      icon: '📈',
      text: `Gastaste un ${vsAvgUsd}% más que tu promedio en USD. Revisá tus gastos variables.`,
      type: 'warn',
    })
  }
  if (avgUyu > 0 && vsAvgUyu <= -10) {
    tips.push({
      icon: '🎉',
      text: `Gastaste un ${Math.abs(vsAvgUyu)}% menos que tu promedio en UYU. ¡Vas bien!`,
      type: 'success',
    })
  }

  // Top growing category
  const topGrowth = categoryGrowth.find((c) => c.delta > 20)
  if (topGrowth) {
    const prevCat = metrics.previousByCategory.find((p) => p.categoryId === topGrowth.categoryId)
    const prevAmt =
      (prevCat?.usd ?? 0) > 0
        ? formatCurrency(prevCat?.usd ?? 0, Currency.USD)
        : formatCurrency(prevCat?.uyu ?? 0, Currency.UYU)
    const curAmt =
      topGrowth.usd > 0
        ? formatCurrency(topGrowth.usd, Currency.USD)
        : formatCurrency(topGrowth.uyu, Currency.UYU)
    tips.push({
      icon: topGrowth.categoryIcon,
      text: `Tu gasto en ${topGrowth.categoryName} subió un ${topGrowth.delta}% (${prevAmt} → ${curAmt}).`,
      type: 'info',
    })
  }

  // Top category share
  if (metrics.byCategory.length > 0 && catGrandTotalForTips > 0) {
    const top = metrics.byCategory[0]
    const topNorm = top ? top.usd * 100 + top.uyu : 0
    const pct = Math.round((topNorm / catGrandTotalForTips) * 100)
    if (pct >= 30 && top) {
      const amt =
        top.usd > 0 ? formatCurrency(top.usd, Currency.USD) : formatCurrency(top.uyu, Currency.UYU)
      tips.push({
        icon: top.categoryIcon,
        text: `${top.categoryName} representa el ${pct}% de tu gasto total (${amt}).`,
        type: 'info',
      })
    }
  }

  const shownTips = tips.slice(0, 3)

  // ── Recent expenses ───────────────────────────────────────
  const expenses = expensesPage?.data ?? []

  const spendCards = [
    {
      currency: Currency.USD,
      total: metrics.totalUsd,
      prev: metrics.previousPeriodUsd,
      deltaPct: usdDeltaPct,
      budgetPct: budgetUsdPct,
      budget: budget?.usd,
      symbol: 'U$S',
      label: 'USD',
    },
    {
      currency: Currency.UYU,
      total: metrics.totalUyu,
      prev: metrics.previousPeriodUyu,
      deltaPct: uyuDeltaPct,
      budgetPct: budgetUyuPct,
      budget: budget?.uyu,
      symbol: '$',
      label: 'UYU',
    },
  ]

  return (
      <div className={styles.desktopGrid}>
        {/* Right: column of independent cards */}
        <div className={styles.desktopRightCol}>
          {/* Stat cards */}
          <div className={styles.desktopMainBox}>
            <p className={styles.desktopSubtitle}>{monthLabel}</p>
            <div className={styles.desktopStatRow}>
              {spendCards.map(
                ({ currency, total, deltaPct, budgetPct, budget: bgt, symbol, label }) => (
                  <div key={currency} className={styles.desktopStatCard}>
                    <div className={styles.desktopStatLabelRow}>
                      <span className={styles.desktopCurrBadge}>{label}</span>
                      <span className={styles.desktopStatLabelText}>ESTE MES</span>
                    </div>
                    <p className={styles.desktopStatValue}>
                      <span className={styles.desktopAmtSymbol}>{symbol} </span>
                      {formatAmount(total, currency).replace(/^\$/, '')}
                    </p>
                    {deltaPct !== 0 && (
                      <div
                        className={[
                          styles.desktopDelta,
                          deltaPct > 0 ? styles.desktopDeltaUp : styles.desktopDeltaDown,
                        ].join(' ')}
                      >
                        {deltaPct > 0 ? '↑' : '↓'}
                        {Math.abs(deltaPct)}%{' '}
                        <span className={styles.desktopDeltaLabel}>vs mes pasado</span>
                      </div>
                    )}
                    {budgetPct !== null && bgt !== undefined && (
                      <>
                        <div className={styles.desktopBudgetBar}>
                          <div
                            className={[
                              styles.desktopBudgetFill,
                              budgetPct >= 90
                                ? styles.budgetDanger
                                : budgetPct >= 70
                                  ? styles.budgetWarn
                                  : styles.budgetOk,
                            ].join(' ')}
                            style={{ width: `${Math.min(budgetPct, 100)}%` }}
                          />
                        </div>
                        <p className={styles.desktopBudgetLabel}>
                          {budgetPct}% de {formatCurrency(bgt, currency)}
                        </p>
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Movements */}
          <div className={styles.desktopMainBox}>
            <div className={styles.desktopSectionHeader}>
              <div className={styles.desktopMovHeaderLeft}>
                <h2 className={styles.desktopSectionTitle}>Últimos movimientos</h2>
                <button
                  className={styles.desktopAddBtn}
                  onClick={() => void navigate('/expenses/new')}
                  title="Nuevo gasto"
                >
                  ＋
                </button>
              </div>
              <button className={styles.desktopSeeAll} onClick={() => void navigate('/expenses')}>
                Ver todos →
              </button>
            </div>
            <div className={styles.desktopMovList}>
              {expenses.length === 0 ? (
                <p className={styles.desktopEmpty}>No hay gastos este mes.</p>
              ) : (
                groupExpensesByDate(expenses.slice(0, 10)).map((group) => (
                  <React.Fragment key={group.date}>
                    <div className={styles.desktopDateHeader}>{group.label}</div>
                    {group.expenses.map((expense) => {
                      const firstCat = categories.find((c) => expense.categoryIds.includes(c.id))
                      const card = cards.find((c) => c.id === expense.cardId)
                      const cardLabel = card
                        ? `${card.type === 'credit' ? 'Crédito' : card.type === 'debit' ? 'Débito' : 'Transf.'} ${card.bank}`
                        : null
                      const subtitle = [firstCat?.name, cardLabel].filter(Boolean).join(' · ')
                      return (
                        <button
                          key={expense.id}
                          className={styles.desktopMovRow}
                          onClick={() => void navigate(`/expenses/${expense.id}`)}
                        >
                          <span className={styles.desktopMovIcon}>{firstCat?.icon ?? '💸'}</span>
                          <div className={styles.desktopMovInfo}>
                            <span className={styles.desktopMovName}>{expense.description}</span>
                            {subtitle && <span className={styles.desktopMovSub}>{subtitle}</span>}
                          </div>
                          <div className={styles.desktopMovAmt}>
                            <span className={styles.desktopMovAmtVal}>
                              {expense.currency === Currency.USD ? 'U$S' : '$'}{' '}
                              {formatCurrency(expense.amount, expense.currency).replace(
                                /^[^\d]*/,
                                ''
                              )}
                            </span>
                            <span className={styles.desktopMovAmtCurrBadge}>
                              {expense.currency}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: pending payments + tips + categories */}
        <div className={styles.desktopSidebar}>
          <h2 className={styles.desktopSectionTitle}>Pagos pendientes</h2>
          <div className={styles.desktopCard}>
            {pendingRecurring.length === 0 ? (
              <div className={styles.desktopAllPaid}>✅ Todos los pagos al día</div>
            ) : (
              pendingRecurring.map((r) => (
                <button
                  key={r.id}
                  className={styles.desktopRecurringRow}
                  onClick={() => void navigate(`/settings/recurring/${r.id}`)}
                >
                  <span className={styles.desktopRecurringIcon}>{r.icon}</span>
                  <div className={styles.desktopRecurringInfo}>
                    <span className={styles.desktopRecurringName}>{r.name}</span>
                    {r.dueDayOfMonth && (
                      <span className={styles.desktopRecurringDue}>
                        Vence el día {r.dueDayOfMonth}
                      </span>
                    )}
                  </div>
                  <span className={styles.desktopRecurringAmt}>
                    {formatCurrency(r.amount, r.currency)}
                  </span>
                </button>
              ))
            )}
          </div>

          {shownTips.length > 0 && (
            <>
              <h2 className={[styles.desktopSectionTitle, styles.desktopSidebarSection].join(' ')}>
                💡 Tips de ahorro
              </h2>
              <div className={styles.desktopCard}>
                {shownTips.map((tip, i) => (
                  <div key={i} className={styles.desktopTipRow}>
                    <span className={styles.desktopTipIcon}>{tip.icon}</span>
                    <p className={styles.desktopTipText}>{tip.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {categoryGrowth.length > 0 && (
            <>
              <h2 className={[styles.desktopSectionTitle, styles.desktopSidebarSection].join(' ')}>
                Categorías destacadas
              </h2>
              <div className={styles.desktopCard}>
                {categoryGrowth.map((cat) => (
                  <div key={cat.categoryId} className={styles.desktopCatRow}>
                    <span className={styles.desktopCatIcon}>{cat.categoryIcon}</span>
                    <span className={styles.desktopCatName}>{cat.categoryName}</span>
                    <span
                      className={[
                        styles.desktopCatDelta,
                        cat.delta > 0 ? styles.catDeltaUp : styles.catDeltaDown,
                      ].join(' ')}
                    >
                      {cat.delta > 0 ? '↑' : '↓'}
                      {Math.abs(cat.delta)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
}
