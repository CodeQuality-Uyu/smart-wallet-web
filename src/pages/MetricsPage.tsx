// src/pages/MetricsPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency, RecurringFrequency, RecurringMode } from '@/types/enums'
import styles from './MetricsPage.module.css'

const PERIODS = [
  { value: MetricsPeriod.SevenDays, label: '7d' },
  { value: MetricsPeriod.Month, label: 'Mes' },
  { value: MetricsPeriod.Year, label: 'Año' },
]

export default function MetricsPage(): React.ReactElement {
  const [period, setPeriod] = useState(MetricsPeriod.Month)
  const { data: metrics, isLoading, error, refetch } = useMetrics(period)
  const { data: budget } = useBudget()

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  // ─── Historical average (all months except current) ──────
  const history = metrics.monthlyHistory.slice(0, -1)
  const avgUsd = history.length > 0 ? history.reduce((s, m) => s + m.usd, 0) / history.length : 0
  const avgUyu = history.length > 0 ? history.reduce((s, m) => s + m.uyu, 0) / history.length : 0

  // ─── vs previous period ───────────────────────────────────
  const usdDeltaPct = metrics.previousPeriodUsd > 0
    ? Math.round(((metrics.totalUsd - metrics.previousPeriodUsd) / metrics.previousPeriodUsd) * 100)
    : 0
  const uyuDeltaPct = metrics.previousPeriodUyu > 0
    ? Math.round(((metrics.totalUyu - metrics.previousPeriodUyu) / metrics.previousPeriodUyu) * 100)
    : 0

  // ─── vs historical average ────────────────────────────────
  const usdVsAvgPct = avgUsd > 0 ? Math.round(((metrics.totalUsd - avgUsd) / avgUsd) * 100) : 0
  const uyuVsAvgPct = avgUyu > 0 ? Math.round(((metrics.totalUyu - avgUyu) / avgUyu) * 100) : 0

  // ─── Fijos vs variables — equivalente mensual (anuales ÷ 12) ─
  const monthlyFixedUsd = metrics.fixedBreakdown
    .filter((i) => i.currency === Currency.USD)
    .reduce((s, i) => s + (i.frequency === RecurringFrequency.Annual ? i.amount / 12 : i.amount), 0)
  const monthlyFixedUyu = metrics.fixedBreakdown
    .filter((i) => i.currency === Currency.UYU)
    .reduce((s, i) => s + (i.frequency === RecurringFrequency.Annual ? i.amount / 12 : i.amount), 0)
  const totalMonthlyFixed = monthlyFixedUsd + monthlyFixedUyu / 100
  const totalVar = metrics.variableUsd + metrics.variableUyu / 100
  const totalAll = totalMonthlyFixed + totalVar
  const fixedPct = totalAll > 0 ? Math.round((totalMonthlyFixed / totalAll) * 100) : 0

  // ─── Category percentages ─────────────────────────────────
  const catGrandTotal = metrics.byCategory.reduce((s, c) => s + c.usd * 100 + c.uyu, 0)

  // ─── Fixed breakdown grouped totals ──────────────────────
  const fixedTotals: Record<string, number> = {}
  for (const item of metrics.fixedBreakdown) {
    const key = `${item.mode}-${item.currency}-${item.frequency}`
    fixedTotals[key] = (fixedTotals[key] ?? 0) + item.amount
  }

  // ─── Bar chart scale ──────────────────────────────────────
  const maxBar = Math.max(...metrics.monthlyHistory.map((m) => Math.max(m.usd, m.uyu / 100)), 1)

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Métricas</h1>
          <div className={styles.periodTabs} role="tablist">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                className={[styles.periodTab, period === p.value ? styles.periodTabActive : ''].join(' ')}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.body}>

        {/* ── 1. Tendencia mensual ────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📈 Tendencia mensual</h2>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#3b82f6' }} /> USD
            <span className={styles.legendDot} style={{ background: 'var(--g500)', marginLeft: 10 }} /> UYU (÷100)
          </div>
          <div className={styles.chart} role="img" aria-label="Gráfico de gasto mensual">
            {metrics.monthlyHistory.map((m, i) => {
              const isLast = i === metrics.monthlyHistory.length - 1
              const usdH = (m.usd / maxBar) * 72
              const uyuH = ((m.uyu / 100) / maxBar) * 72
              return (
                <div key={`${m.year}-${m.month}`} className={styles.barGroup}>
                  <div className={styles.bars}>
                    <div
                      className={styles.bar}
                      style={{ height: usdH, background: isLast ? '#2563eb' : '#93c5fd' }}
                    />
                    <div
                      className={styles.bar}
                      style={{ height: uyuH, background: isLast ? 'var(--g600)' : 'var(--g300)' }}
                    />
                  </div>
                  <p className={[styles.barLabel, isLast ? styles.barLabelCurrent : ''].join(' ')}>
                    {m.label}
                  </p>
                </div>
              )
            })}
          </div>
          <div className={styles.avgRow}>
            <span className={styles.avgLbl}>Promedio histórico</span>
            <span className={styles.avgVal}>
              {formatAmount(avgUsd, Currency.USD)} USD · {formatAmount(avgUyu, Currency.UYU)} UYU
            </span>
          </div>
        </div>

        {/* ── 2. Comparativas ─────────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📊 Comparativas</h2>

          {([
            { currency: Currency.USD, total: metrics.totalUsd, prev: metrics.previousPeriodUsd, prevPct: usdDeltaPct, avgPct: usdVsAvgPct, budget: budget?.usd, flag: '🇺🇸' },
            { currency: Currency.UYU, total: metrics.totalUyu, prev: metrics.previousPeriodUyu, prevPct: uyuDeltaPct, avgPct: uyuVsAvgPct, budget: budget?.uyu, flag: '🇺🇾' },
          ] as const).map(({ currency, total, prevPct, avgPct, budget: bgt, flag }) => {
            const budgetPct = bgt && bgt > 0 ? Math.min(Math.round((total / bgt) * 100), 100) : null
            return (
              <div key={currency} className={styles.compareBlock}>
                <div className={styles.compareHeader}>
                  <span className={styles.compareFlag}>{flag} {currency}</span>
                  <span className={styles.compareTotal}>{formatAmount(total, currency)}</span>
                </div>

                <div className={styles.compareBadges}>
                  <div className={styles.compareStat}>
                    <span className={styles.compareStatLbl}>vs período anterior</span>
                    <span className={[styles.delta, prevPct > 0 ? styles.deltaUp : prevPct < 0 ? styles.deltaDown : styles.deltaNeutral].join(' ')}>
                      {prevPct > 0 ? '↑' : prevPct < 0 ? '↓' : '='} {Math.abs(prevPct)}%
                    </span>
                  </div>
                  <div className={styles.compareStat}>
                    <span className={styles.compareStatLbl}>vs promedio histórico</span>
                    <span className={[styles.delta, avgPct > 0 ? styles.deltaUp : avgPct < 0 ? styles.deltaDown : styles.deltaNeutral].join(' ')}>
                      {avgPct > 0 ? '↑' : avgPct < 0 ? '↓' : '='} {Math.abs(avgPct)}%
                    </span>
                  </div>
                </div>

                {bgt && bgt > 0 && budgetPct !== null && (
                  <div className={styles.budgetRow}>
                    <div className={styles.budgetLabels}>
                      <span className={styles.budgetLbl}>Presupuesto</span>
                      <span className={styles.budgetPct}>{formatAmount(total, currency)} / {formatAmount(bgt, currency)} ({budgetPct}%)</span>
                    </div>
                    <div className={styles.budgetBar}>
                      <div
                        className={styles.budgetFill}
                        style={{
                          width: `${budgetPct}%`,
                          background: budgetPct >= 100 ? 'var(--rose)' : budgetPct >= 80 ? 'var(--amb)' : 'var(--g500)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 3. Fijos vs Variables ───────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>⚖️ Fijos vs Variables</h2>

          <div className={styles.splitBar}>
            <div className={styles.splitFixed} style={{ width: `${fixedPct}%` }} />
          </div>
          <div className={styles.splitLegend}>
            <div className={styles.splitItem}>
              <span className={styles.splitDot} style={{ background: '#7c3aed' }} />
              <span className={styles.splitLbl}>Fijos</span>
              <span className={styles.splitPct}>{fixedPct}%</span>
            </div>
            <div className={styles.splitItem}>
              <span className={styles.splitDot} style={{ background: 'var(--g400)' }} />
              <span className={styles.splitLbl}>Variables</span>
              <span className={styles.splitPct}>{100 - fixedPct}%</span>
            </div>
          </div>

          <p className={styles.splitNote}>Fijos mensuales + anuales ÷ 12</p>

          <div className={styles.splitAmounts}>
            <div className={styles.splitAmtRow}>
              <span className={styles.splitAmtLbl} style={{ color: '#7c3aed' }}>Fijos (equiv. mensual)</span>
              <span className={styles.splitAmtVal}>
                {monthlyFixedUsd > 0 && <span>{formatAmount(monthlyFixedUsd, Currency.USD)} USD</span>}
                {monthlyFixedUsd > 0 && monthlyFixedUyu > 0 && <span className={styles.dot}> · </span>}
                {monthlyFixedUyu > 0 && <span>{formatAmount(monthlyFixedUyu, Currency.UYU)} UYU</span>}
              </span>
            </div>
            <div className={styles.splitAmtRow}>
              <span className={styles.splitAmtLbl}>Variables</span>
              <span className={styles.splitAmtVal}>
                {metrics.variableUsd > 0 && <span>{formatAmount(metrics.variableUsd, Currency.USD)} USD</span>}
                {metrics.variableUsd > 0 && metrics.variableUyu > 0 && <span className={styles.dot}> · </span>}
                {metrics.variableUyu > 0 && <span>{formatAmount(metrics.variableUyu, Currency.UYU)} UYU</span>}
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. Por categoría ────────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🏷 Por categoría</h2>
          {metrics.byCategory.map((cat) => {
            const normalized = cat.usd * 100 + cat.uyu
            const pct = catGrandTotal > 0 ? Math.round((normalized / catGrandTotal) * 100) : 0

            const prevCat = metrics.previousByCategory.find((p) => p.categoryId === cat.categoryId)
            const prevNorm = prevCat ? prevCat.usd * 100 + prevCat.uyu : 0
            const delta = prevNorm > 0 ? Math.round(((normalized - prevNorm) / prevNorm) * 100) : 0

            const amtStr = [
              cat.usd > 0 ? `${formatCurrency(cat.usd, Currency.USD)} USD` : '',
              cat.uyu > 0 ? `${formatAmount(cat.uyu, Currency.UYU)} UYU` : '',
            ].filter(Boolean).join(' + ')

            return (
              <div key={cat.categoryId} className={styles.catRow}>
                <div className={styles.catTop}>
                  <div className={styles.catInfo}>
                    <span>{cat.categoryIcon}</span>
                    <span className={styles.catName}>{cat.categoryName}</span>
                  </div>
                  <div className={styles.catRight}>
                    <span className={styles.catAmt}>{amtStr}</span>
                    {delta !== 0 && (
                      <span className={[styles.catDelta, delta > 0 ? styles.deltaUp : styles.deltaDown].join(' ')}>
                        {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.catBar}>
                  <div className={styles.catBarFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── 5. Gastos fijos ─────────────────────────────── */}
        <div className={[styles.card, styles.fixedCard].join(' ')}>
          <h2 className={styles.cardTitle}>🔄 Gastos fijos</h2>

          {metrics.fixedBreakdown.map((item) => (
            <div key={item.recurringId + item.name} className={styles.fixedRow}>
              <div className={styles.fixedLeft}>
                <span>{item.icon}</span>
                <span className={styles.fixedName}>{item.name}</span>
                <span className={[styles.modeBadge, item.mode === RecurringMode.Auto ? styles.modeAuto : styles.modeManual].join(' ')}>
                  {item.mode === RecurringMode.Auto ? 'Auto' : 'Manual'}
                </span>
              </div>
              <div className={styles.fixedRight}>
                <span className={styles.fixedAmt}>{formatCurrency(item.amount, item.currency)} {item.currency}</span>
                <span className={styles.fixedFreq}>/ {item.frequency === RecurringFrequency.Annual ? 'año' : 'mes'}</span>
              </div>
            </div>
          ))}

          <div className={styles.fixedDivider} />

          {/* Por mes */}
          <p className={styles.fixedTotalGroup}>Por mes</p>
          {([Currency.USD, Currency.UYU] as const).map((cur) => {
            const total = metrics.fixedBreakdown
              .filter((i) => i.frequency === RecurringFrequency.Monthly && i.currency === cur)
              .reduce((s, i) => s + i.amount, 0)
            if (total === 0) return null
            return (
              <div key={`m-${cur}`} className={styles.fixedTotalRow}>
                <span className={styles.fixedTotalLbl}>{cur} mensual</span>
                <span className={styles.fixedTotalAmt}>{formatCurrency(total, cur)}</span>
              </div>
            )
          })}

          {/* Por año */}
          {metrics.fixedBreakdown.some((i) => i.frequency === RecurringFrequency.Annual) && (
            <>
              <p className={styles.fixedTotalGroup} style={{ marginTop: 8 }}>Por año</p>
              {([Currency.USD, Currency.UYU] as const).map((cur) => {
                const total = metrics.fixedBreakdown
                  .filter((i) => i.frequency === RecurringFrequency.Annual && i.currency === cur)
                  .reduce((s, i) => s + i.amount, 0)
                if (total === 0) return null
                return (
                  <div key={`a-${cur}`} className={styles.fixedTotalRow}>
                    <span className={styles.fixedTotalLbl}>{cur} anual</span>
                    <span className={styles.fixedTotalAmt}>{formatCurrency(total, cur)}</span>
                  </div>
                )
              })}
            </>
          )}

          {/* Equivalente mensual real */}
          <p className={styles.fixedTotalGroup} style={{ marginTop: 8 }}>Equivalente mensual</p>
          {([Currency.USD, Currency.UYU] as const).map((cur) => {
            const monthly = metrics.fixedBreakdown
              .filter((i) => i.frequency === RecurringFrequency.Monthly && i.currency === cur)
              .reduce((s, i) => s + i.amount, 0)
            const annual = metrics.fixedBreakdown
              .filter((i) => i.frequency === RecurringFrequency.Annual && i.currency === cur)
              .reduce((s, i) => s + i.amount, 0)
            const equiv = monthly + annual / 12
            if (equiv === 0) return null
            return (
              <div key={`e-${cur}`} className={[styles.fixedTotalRow, styles.fixedTotalHighlight].join(' ')}>
                <span className={styles.fixedTotalLbl}>{cur}/mes (incl. anuales)</span>
                <span className={styles.fixedTotalAmt}>{formatCurrency(equiv, cur)}</span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
