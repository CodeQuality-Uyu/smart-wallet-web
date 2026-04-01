// src/pages/MetricsPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency, RecurringFrequency } from '@/types/enums'
import styles from './MetricsPage.module.css'

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const _now = new Date()
const _monthLabel = `${MONTH_NAMES[_now.getMonth()]} ${_now.getFullYear()}`

const PERIODS = [
  { value: MetricsPeriod.SevenDays, label: '7d', sublabel: 'Últimos 7 días' },
  { value: MetricsPeriod.Month, label: 'Mes', sublabel: _monthLabel },
  { value: MetricsPeriod.ThreeMonths, label: '3m', sublabel: 'Últimos 3 meses' },
  { value: MetricsPeriod.Year, label: 'Año', sublabel: 'Último año' },
]

function getPeriodRange(p: MetricsPeriod): string {
  const now = new Date()
  const fmt = (d: Date) => d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
  switch (p) {
    case MetricsPeriod.SevenDays: {
      const from = new Date(now); from.setDate(from.getDate() - 6)
      return `${fmt(from)} – ${fmt(now)}`
    }
    case MetricsPeriod.Month: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return `${fmt(from)} – ${fmt(now)}`
    }
    case MetricsPeriod.ThreeMonths: {
      const from = new Date(now); from.setMonth(from.getMonth() - 3)
      return `${fmt(from)} – ${fmt(now)}`
    }
    case MetricsPeriod.Year: {
      const from = new Date(now.getFullYear(), 0, 1)
      return `${fmt(from)} – ${fmt(now)}`
    }
  }
}

function fmtShort(n: number): string {
  if (n === 0) return ''
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

type CurrencyFilter = 'both' | 'usd' | 'uyu'

export default function MetricsPage(): React.ReactElement {
  const [period, setPeriod] = useState(MetricsPeriod.Month)
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('both')
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

  const activePeriod = PERIODS.find((p) => p.value === period)
  const periodRange = getPeriodRange(period)

  return (
    <div className={styles.page}>

      {/* Desktop header */}
      <div className={styles.desktopHeader}>
        <div>
          <p className={styles.desktopMonthLabel}>{_monthLabel}</p>
          <p className={styles.desktopRange}>Desde {periodRange.split('–')[0].trim()} hasta {periodRange.split('–')[1].trim()}</p>
        </div>
        <div className={styles.desktopTabs} role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              role="tab"
              aria-selected={period === p.value}
              className={[styles.desktopTab, period === p.value ? styles.desktopTabActive : ''].join(' ')}
              onClick={() => setPeriod(p.value)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Mobile header */}
      <header className={styles.header}>
        <p className={styles.mobileMonth}>{activePeriod?.sublabel}</p>
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
      </header>

      <div className={styles.body}>

        {/* ── 1. Tendencia mensual ────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.trendHeader}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>📈 Tendencia mensual</h2>
            <div className={styles.currencyTabs}>
              {([['both', 'Ambas'], ['usd', 'USD'], ['uyu', 'UYU']] as [CurrencyFilter, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  className={[styles.currencyTab, currencyFilter === val ? styles.currencyTabActive : ''].join(' ')}
                  onClick={() => setCurrencyFilter(val)}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {metrics.monthlyHistory.length === 0 ? (
            <p className={styles.trendEmpty}>No hay datos históricos para mostrar.</p>
          ) : (
            <>
              {(() => {
                const showUsd = currencyFilter === 'both' || currencyFilter === 'usd'
                const showUyu = currencyFilter === 'both' || currencyFilter === 'uyu'
                const maxUsd = Math.max(...metrics.monthlyHistory.map((m) => m.usd), 1)
                const maxUyu = Math.max(...metrics.monthlyHistory.map((m) => m.uyu), 1)

                return metrics.monthlyHistory.map((m, i) => {
                  const prev = metrics.monthlyHistory[i - 1]
                  const isLast = i === metrics.monthlyHistory.length - 1

                  const usdPct = prev && prev.usd > 0 ? Math.round(((m.usd - prev.usd) / prev.usd) * 100) : null
                  const uyuPct = prev && prev.uyu > 0 ? Math.round(((m.uyu - prev.uyu) / prev.uyu) * 100) : null

                  return (
                    <div key={`${m.year}-${m.month}`} className={[styles.trendRow, isLast ? styles.trendRowCurrent : ''].join(' ')}>
                      <span className={styles.trendMonth}>{m.label}</span>
                      <div className={styles.trendBars}>
                        {showUsd && (
                          <div className={styles.trendBarWrap}>
                            <div
                              className={styles.trendBar}
                              style={{ width: `${(m.usd / maxUsd) * 100}%`, background: isLast ? '#2563eb' : '#93c5fd' }}
                            />
                          </div>
                        )}
                        {showUyu && (
                          <div className={styles.trendBarWrap}>
                            <div
                              className={styles.trendBar}
                              style={{ width: `${(m.uyu / maxUyu) * 100}%`, background: isLast ? 'var(--g600)' : 'var(--g300)' }}
                            />
                          </div>
                        )}
                      </div>
                      <div className={styles.trendAmts}>
                        {showUsd && (
                          <span className={styles.trendAmt} style={{ color: '#2563eb' }}>
                            {fmtShort(m.usd) || '—'}{currencyFilter === 'both' && <span className={styles.trendCurrency}>USD</span>}
                            {usdPct !== null && (
                              <span className={[styles.trendDelta, usdPct > 0 ? styles.deltaUp : usdPct < 0 ? styles.deltaDown : styles.deltaNeutral].join(' ')}>
                                {usdPct > 0 ? '↑' : usdPct < 0 ? '↓' : '='}{Math.abs(usdPct)}%
                              </span>
                            )}
                          </span>
                        )}
                        {showUyu && (
                          <span className={styles.trendAmt} style={{ color: 'var(--g600)' }}>
                            {fmtShort(m.uyu) || '—'}{currencyFilter === 'both' && <span className={styles.trendCurrency}>UYU</span>}
                            {uyuPct !== null && (
                              <span className={[styles.trendDelta, uyuPct > 0 ? styles.deltaUp : uyuPct < 0 ? styles.deltaDown : styles.deltaNeutral].join(' ')}>
                                {uyuPct > 0 ? '↑' : uyuPct < 0 ? '↓' : '='}{Math.abs(uyuPct)}%
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
              <div className={styles.avgRow}>
                <span className={styles.avgLbl}>Promedio histórico</span>
                <span className={styles.avgVal}>
                  {(currencyFilter === 'both' || currencyFilter === 'usd') && `${formatAmount(avgUsd, Currency.USD)} USD`}
                  {currencyFilter === 'both' && ' · '}
                  {(currencyFilter === 'both' || currencyFilter === 'uyu') && `${formatAmount(avgUyu, Currency.UYU)} UYU`}
                </span>
              </div>
            </>
          )}
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
              <span className={styles.splitLbl}>Fijos <span className={styles.splitLblNote}>(mensuales + anuales ÷ 12)</span></span>
              <span className={styles.splitPct}>{fixedPct}%</span>
            </div>
            <div className={styles.splitItem}>
              <span className={styles.splitDot} style={{ background: 'var(--g400)' }} />
              <span className={styles.splitLbl}>Variables</span>
              <span className={styles.splitPct}>{100 - fixedPct}%</span>
            </div>
          </div>

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
          <h2 className={styles.cardTitle}>🗂 Por categoría</h2>
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


      </div>
    </div>
  )
}
