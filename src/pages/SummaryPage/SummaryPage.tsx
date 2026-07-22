// src/pages/SummaryPage/SummaryPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PeriodControl } from '@/components/ui/PeriodControl'
import { VariableTrendCard } from '@/features/metrics/components/VariableTrendCard'
import { SavingsSuggestionsCard } from '@/features/metrics/components/SavingsSuggestionsCard'
import { CURRENCY_OPTIONS } from '@/constants/currencyOptions'
import { Currency, PeriodFilter } from '@/types/enums'
import styles from './SummaryPage.module.css'

export default function SummaryPage(): React.ReactElement {
  const [currencyFilter, setCurrencyFilter] = useState<Currency | ''>('')
  // The trend uses monthlyHistory, which is period-independent (always last 6 months).
  const { data: metrics, isLoading, error, refetch } = useMetrics()

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.title}>Resumen</p>
          <p className={styles.subtitle}>Tendencia de tus gastos variables — últimos 6 meses</p>
        </div>
      </div>

      <div className={styles.chips}>
        <PeriodControl
          options={CURRENCY_OPTIONS}
          value={currencyFilter}
          onChange={setCurrencyFilter}
        />
      </div>

      <SavingsSuggestionsCard
        currencyFilter={currencyFilter}
        period={PeriodFilter.SixMonths}
        scopeLabel="Últimos 6 meses"
      />

      <VariableTrendCard monthlyHistory={metrics.monthlyHistory} currencyFilter={currencyFilter} />
    </div>
  )
}
