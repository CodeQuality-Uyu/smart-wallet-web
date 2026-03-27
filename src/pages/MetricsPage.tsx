// src/pages/MetricsPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency, RecurringFrequency } from '@/types/enums'
import styles from './MetricsPage.module.css'

const PERIODS = [
  { value: MetricsPeriod.SevenDays, label: '7d' },
  { value: MetricsPeriod.Month, label: 'Mes' },
  { value: MetricsPeriod.Year, label: 'Año' },
]

export default function MetricsPage(): React.ReactElement {
  const [period, setPeriod] = useState(MetricsPeriod.Month)
  const { data: metrics, isLoading, error, refetch } = useMetrics(period)

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  const usdDeltaPct = metrics.previousPeriodUsd > 0
    ? Math.round(((metrics.totalUsd - metrics.previousPeriodUsd) / metrics.previousPeriodUsd) * 100)
    : 0
  const uyuDeltaPct = metrics.previousPeriodUyu > 0
    ? Math.round(((metrics.totalUyu - metrics.previousPeriodUyu) / metrics.previousPeriodUyu) * 100)
    : 0

  const maxBar = Math.max(...metrics.monthlyHistory.map((m) => Math.max(m.usd, m.uyu / 100)))

  return (
    <div className={styles.page}>
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
        {/* Spend cards */}
        {[
          { currency: Currency.USD, total: metrics.totalUsd, prev: metrics.previousPeriodUsd, pct: usdDeltaPct, flag: '🇺🇸', label: 'Dólares (USD)' },
          { currency: Currency.UYU, total: metrics.totalUyu, prev: metrics.previousPeriodUyu, pct: uyuDeltaPct, flag: '🇺🇾', label: 'Pesos (UYU)' },
        ].map(({ currency, total, prev, pct, flag, label }) => (
          <div key={currency} className={styles.spendCard}>
            <div className={styles.spendCardTop}>
              <div>
                <p className={styles.spendFlag}>{flag}</p>
                <p className={styles.spendCurrency}>{label}</p>
                <p className={styles.spendCardLabel}>Gastado este período</p>
              </div>
              {pct !== 0 && (
                <span className={[styles.delta, pct > 0 ? styles.deltaUp : styles.deltaDown].join(' ')}>
                  {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
                </span>
              )}
            </div>
            <p className={styles.spendAmount}>{formatAmount(total, currency)}</p>
            <div className={styles.compareLabels}>
              <span className={styles.prevLabel}>Anterior {formatAmount(prev, currency)}</span>
              <span className={[styles.currLabel, pct > 0 ? styles.deltaUp : styles.deltaDown].join(' ')}>
                Actual {formatAmount(total, currency)}
              </span>
            </div>
            <div className={styles.compareBar}>
              <div className={styles.prevBar} style={{ width: '100%' }} />
              <div
                className={styles.currBar}
                style={{
                  width: `${Math.min((total / Math.max(prev, 1)) * 100, 130)}%`,
                  background: currency === Currency.USD
                    ? 'linear-gradient(90deg,#2563eb,#38bdf8)'
                    : 'linear-gradient(90deg,var(--g600),var(--g300))',
                }}
              />
            </div>
          </div>
        ))}

        {/* Fixed expenses */}
        <div className={styles.fixedCard}>
          <h2 className={styles.cardTitle}>🔄 Gastos fijos del mes</h2>
          {metrics.fixedBreakdown.map((item, idx) => (
            <div
              key={item.recurringId + item.name}
              className={styles.fixedRow}
              style={idx === metrics.fixedBreakdown.length - 1 ? { borderBottom: 'none' } : undefined}
            >
              <span className={styles.fixedName}>{item.icon} {item.name}</span>
              <span className={styles.fixedAmt}>{formatCurrency(item.amount, item.currency)} {item.currency}</span>
            </div>
          ))}
          <div className={styles.fixedDivider} />
          {[Currency.UYU, Currency.USD].flatMap((cur) =>
            [RecurringFrequency.Monthly, RecurringFrequency.Annual].map((freq) => {
              const total = metrics.fixedBreakdown
                .filter((i) => i.currency === cur && i.frequency === freq)
                .reduce((s, i) => s + i.amount, 0)
              if (total === 0) return null
              const freqLabel = freq === RecurringFrequency.Monthly ? 'mensual' : 'anual'
              return (
                <div key={`${cur}-${freq}`} className={styles.fixedRow} style={{ fontWeight: 700 }}>
                  <span className={styles.fixedName} style={{ color: '#6b21a8' }}>Total {cur} {freqLabel}</span>
                  <span className={styles.fixedAmt} style={{ color: '#6b21a8' }}>{formatCurrency(total, cur)}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Monthly bar chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Gasto mensual</h2>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#2563eb' }} /> USD
            <span className={styles.legendDot} style={{ background: 'var(--g500)', marginLeft: 12 }} /> UYU (÷100)
          </div>
          <div className={styles.chart} role="img" aria-label="Gráfico de gasto mensual">
            {metrics.monthlyHistory.map((m) => {
              const usdH = maxBar > 0 ? (m.usd / maxBar) * 80 : 0
              const uyuH = maxBar > 0 ? ((m.uyu / 100) / maxBar) * 80 : 0
              return (
                <div key={`${m.year}-${m.month}`} className={styles.barGroup}>
                  <div className={styles.bars}>
                    <div className={styles.bar} style={{ height: usdH, background: '#3b82f6' }} />
                    <div className={styles.bar} style={{ height: uyuH, background: 'var(--g400)' }} />
                  </div>
                  <p className={styles.barLabel}>{m.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* By category */}
        <div className={styles.catCard}>
          <h2 className={styles.cardTitle}>Gasto por categoría</h2>
          {metrics.byCategory.map((cat) => {
            const totalStr = [
              cat.usd > 0 ? `${formatCurrency(cat.usd, Currency.USD)} USD` : '',
              cat.uyu > 0 ? `${formatAmount(cat.uyu, Currency.UYU)} UYU` : '',
            ].filter(Boolean).join(' + ')

            return (
              <div key={cat.categoryId} className={styles.catRow}>
                <div className={styles.catInfo}>
                  <span>{cat.categoryIcon}</span>
                  <span className={styles.catName}>{cat.categoryName}</span>
                </div>
                <span className={styles.catAmt}>{totalStr}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
