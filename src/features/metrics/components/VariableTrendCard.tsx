// src/features/metrics/components/VariableTrendCard.tsx
//
// Monthly trend of VARIABLE spending only (excludes fixed recurring costs),
// split by currency. Used by the "Resumen" page. Renderizado con recharts.

import React from 'react'
import { Currency } from '@/types/enums'
import { formatAmount } from '@/utils/formatCurrency'
import type { MetricsSummary } from '@/backend/types'
import { TrendChart } from './charts/charts'
import styles from './VariableTrendCard.module.css'

type MonthlyHistory = MetricsSummary['monthlyHistory']

interface VariableTrendCardProps {
  monthlyHistory: MonthlyHistory
  currencyFilter: Currency | ''
}

export function VariableTrendCard({
  monthlyHistory,
  currencyFilter,
}: VariableTrendCardProps): React.ReactElement {
  const showUsd = currencyFilter === '' || currencyFilter === Currency.USD
  const showUyu = currencyFilter === '' || currencyFilter === Currency.UYU

  // Historical average excludes the current (last) month.
  const history = monthlyHistory.slice(0, -1)
  const avgVarUsd = history.length > 0 ? history.reduce((s, m) => s + m.variableUsd, 0) / history.length : 0
  const avgVarUyu = history.length > 0 ? history.reduce((s, m) => s + m.variableUyu, 0) / history.length : 0

  const data = monthlyHistory.map((m) => ({
    label: m.label,
    usd: m.variableUsd,
    uyu: m.variableUyu,
  }))

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>📈 Tendencia mensual variable</h3>
      <div className={styles.legend}>
        {showUyu && (
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#16a34a' }} />
            Variable UYU
          </span>
        )}
        {showUsd && (
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
            Variable USD
          </span>
        )}
      </div>

      {monthlyHistory.length === 0 ? (
        <p className={styles.empty}>No hay datos históricos para mostrar.</p>
      ) : (
        <>
          <TrendChart
            data={data}
            showUsd={showUsd}
            showUyu={showUyu}
            avgUsd={avgVarUsd}
            avgUyu={avgVarUyu}
          />
          <div className={styles.avgRow}>
            <span className={styles.avgLbl}>Promedio variable (línea punteada)</span>
            <span className={styles.avgVal}>
              {showUsd && `${formatAmount(avgVarUsd, Currency.USD)} USD`}
              {currencyFilter === '' && ' · '}
              {showUyu && `${formatAmount(avgVarUyu, Currency.UYU)} UYU`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
