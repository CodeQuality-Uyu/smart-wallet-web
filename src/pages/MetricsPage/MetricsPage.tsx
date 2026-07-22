// src/pages/MetricsPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl, PeriodDescription } from '@/components/ui/PeriodControl'
import { METRICS_PERIODS } from '@/components/ui/PeriodControl.constants'
import { SavingsSuggestionsCard } from '@/features/metrics/components/SavingsSuggestionsCard'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatAmount } from '@/utils/formatCurrency'
import { intervalMonths } from '@/utils/recurringSchedule'
import { PeriodFilter, Currency } from '@/types/enums'
import { DistributionChart, SavingsRing, SplitDonut, BudgetBar } from '@/features/metrics/components/charts/charts'
import type { DistributionRow } from '@/features/metrics/components/charts/charts'
import styles from './MetricsPage.module.css'
import { CURRENCY_OPTIONS } from '@/constants/currencyOptions'
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
const _now = new Date()
const _monthLabel = `${MONTH_NAMES[_now.getMonth()]} ${_now.getFullYear()}`

// ISO (YYYY-MM-DD) bounds for a period — mirrors the metrics backend so the
// client-side "Gasto por local" aggregation matches the rest of the page.
function periodIsoBounds(period: PeriodFilter): { start: string; end: string } {
  const now = new Date()
  const iso = (d: Date): string => d.toISOString().split('T')[0] as string
  const today = iso(now)
  switch (period) {
    case PeriodFilter.SevenDays: {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { start: iso(d), end: today }
    }
    case PeriodFilter.LastMonth: {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: iso(first), end: iso(last) }
    }
    case PeriodFilter.ThreeMonths: {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return { start: iso(d), end: today }
    }
    case PeriodFilter.Year:
      return { start: `${now.getFullYear()}-01-01`, end: today }
    case PeriodFilter.All:
      return { start: '1970-01-01', end: today }
    case PeriodFilter.Month:
    default: {
      const m = String(now.getMonth() + 1).padStart(2, '0')
      return { start: `${now.getFullYear()}-${m}-01`, end: today }
    }
  }
}

export default function MetricsPage(): React.ReactElement {
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [currencyFilter, setCurrencyFilter] = useState<Currency | ''>('')
  const [activeCatId, setActiveCatId] = useState<string>('')
  const { data: metrics, isLoading, error, refetch } = useMetrics(period)
  const { data: budget } = useBudget()
  const { data: categories } = useCategories()
  const { data: productCategories } = useProductCategories()
  const { data: expensesData } = useExpenses()
  const { data: places } = usePlaces()

  // Gasto por local — aggregated client-side from expenses within the period
  // (the metrics backend does not expose a by-place breakdown).
  const sortedByPlace = React.useMemo(() => {
    const { start, end } = periodIsoBounds(period)
    const map = new Map<string, { placeId: string; uyu: number; usd: number }>()
    for (const exp of expensesData?.data ?? []) {
      if (!exp.placeId || exp.date < start || exp.date > end) continue
      const entry = map.get(exp.placeId) ?? { placeId: exp.placeId, uyu: 0, usd: 0 }
      if (exp.currency === Currency.UYU) entry.uyu += exp.amount
      else if (exp.currency === Currency.USD) entry.usd += exp.amount
      map.set(exp.placeId, entry)
    }
    return [...map.values()].sort((a, b) => b.uyu + b.usd - (a.uyu + a.usd))
  }, [expensesData, period])

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  const lastMonthDate = new Date(_now.getFullYear(), _now.getMonth() - 1, 1)
  const headerLabel =
    period === PeriodFilter.LastMonth
      ? `${MONTH_NAMES[lastMonthDate.getMonth()]} ${lastMonthDate.getFullYear()}`
      : _monthLabel

  // ─── Historical average (all months except current) ──────
  const history = metrics.monthlyHistory.slice(0, -1)
  const avgUsd = history.length > 0 ? history.reduce((s, m) => s + m.usd, 0) / history.length : 0
  const avgUyu = history.length > 0 ? history.reduce((s, m) => s + m.uyu, 0) / history.length : 0

  // ─── vs previous period ───────────────────────────────────
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

  // ─── vs historical average ────────────────────────────────
  const usdVsAvgPct = avgUsd > 0 ? Math.round(((metrics.totalUsd - avgUsd) / avgUsd) * 100) : 0
  const uyuVsAvgPct = avgUyu > 0 ? Math.round(((metrics.totalUyu - avgUyu) / avgUyu) * 100) : 0

  // ─── Fijos vs variables — equivalente mensual (anuales ÷ 12) ─
  const monthlyFixedUsd = metrics.fixedBreakdown
    .filter((i) => i.currency === Currency.USD)
    .reduce((s, i) => s + i.amount / intervalMonths(i.frequency), 0)
  const monthlyFixedUyu = metrics.fixedBreakdown
    .filter((i) => i.currency === Currency.UYU)
    .reduce((s, i) => s + i.amount / intervalMonths(i.frequency), 0)
  // ─── Category percentages ─────────────────────────────────
  // Sin filtro: solo categorías raíz (los totales del padre ya incluyen a sus hijas
  // por el rollup, así que mostrar también las hijas duplicaría el gasto en la lista).
  // Con un chip seleccionado: esa categoría puntual (raíz o hija).
  const filteredByCategory = activeCatId
    ? metrics.byCategory.filter((c) => c.categoryId === activeCatId)
    : metrics.byCategory.filter((c) => !c.parentId)

  // Filas para los charts de distribución (recharts).
  const categoryRows: DistributionRow[] = filteredByCategory.map((c) => ({
    name: `${c.categoryIcon} ${c.categoryName}`,
    uyu: c.uyu,
    usd: c.usd,
    color: categories?.find((cat) => cat.id === c.categoryId)?.color ?? '#22c55e',
  }))
  const productRows: DistributionRow[] = metrics.byProductCategory.map((pc) => ({
    name: `${pc.productCategoryIcon} ${pc.productCategoryName}`,
    uyu: pc.uyu,
    usd: pc.usd,
    color: productCategories?.find((c) => c.id === pc.productCategoryId)?.color ?? '#22c55e',
  }))
  const placeRows: DistributionRow[] = sortedByPlace.map((pl) => {
    const place = places?.find((p) => p.id === pl.placeId)
    return {
      name: `${place?.icon ?? '📍'} ${place?.name ?? 'Sin local'}`,
      uyu: pl.uyu,
      usd: pl.usd,
      color: '#22c55e',
    }
  })

  // ─── Desktop stat values por moneda ──────────────────
  const incomeUsd = budget?.usd ?? 0
  const incomeUyu = budget?.uyu ?? 0
  const spentUsd = metrics.totalUsd
  const spentUyu = metrics.totalUyu
  const savedUsd = Math.max(0, incomeUsd - spentUsd)
  const savedUyu = Math.max(0, incomeUyu - spentUyu)
  const rateUsd = incomeUsd > 0 ? Math.round((savedUsd / incomeUsd) * 100) : 0
  const rateUyu = incomeUyu > 0 ? Math.round((savedUyu / incomeUyu) * 100) : 0

  // Para filtro moneda única
  const incomeForFilter = currencyFilter === Currency.USD ? incomeUsd : incomeUyu
  const spentForFilter = currencyFilter === Currency.USD ? spentUsd : spentUyu
  const savedForFilter = currencyFilter === Currency.USD ? savedUsd : savedUyu
  const savingsRatePct = currencyFilter === Currency.USD ? rateUsd : rateUyu
  const displayCurrency = currencyFilter === Currency.USD ? Currency.USD : Currency.UYU

  return (
    <div className={styles.page}>
      {/* Desktop header */}
      <div className={styles.desktopHeader}>
        <div className={styles.desktopHeaderLeft}>
          <p className={styles.desktopTitle}>{headerLabel}</p>
          <PeriodDescription period={period} />
        </div>
        <div className={styles.desktopHeaderControls}>
          <PeriodControl options={METRICS_PERIODS} value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Desktop currency chips */}
      <div className={styles.desktopCatChips}>
        <PeriodControl
          options={CURRENCY_OPTIONS}
          value={currencyFilter}
          onChange={setCurrencyFilter}
        />
      </div>

      {/* Desktop category chips */}
      <div className={styles.desktopCatChips}>
        <button
          className={[
            styles.desktopCatChip,
            activeCatId === '' ? styles.desktopCatChipActive : '',
          ].join(' ')}
          onClick={() => setActiveCatId('')}
        >
          Todas
        </button>
        {(categories ?? [])
          .filter((c) => c.active)
          .map((cat) => (
            <button
              key={cat.id}
              className={[
                styles.desktopCatChip,
                activeCatId === cat.id ? styles.desktopCatChipActive : '',
              ].join(' ')}
              onClick={() => setActiveCatId(activeCatId === cat.id ? '' : cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
      </div>

      {/* Desktop ring cards row */}
      <div className={currencyFilter === '' ? styles.desktopRingRow2 : styles.desktopRingRow1}>
        {(currencyFilter === ''
          ? [
              {
                cur: Currency.UYU,
                income: incomeUyu,
                spent: spentUyu,
                saved: savedUyu,
                rate: rateUyu,
              },
              {
                cur: Currency.USD,
                income: incomeUsd,
                spent: spentUsd,
                saved: savedUsd,
                rate: rateUsd,
              },
            ]
          : [
              {
                cur: displayCurrency,
                income: incomeForFilter,
                spent: spentForFilter,
                saved: savedForFilter,
                rate: savingsRatePct,
              },
            ]
        ).map(({ cur, income, spent, saved, rate }) => (
          <div key={cur} className={styles.desktopRingCardLight}>
            <div className={styles.desktopRingLightHeader}>
              <p className={styles.desktopRingLightTitle}>🐷 Ahorro del mes · {cur}</p>
            </div>
            <div className={styles.desktopRingLightBody}>
              <div className={styles.desktopRingChartInner}>
                <SavingsRing rate={rate} />
              </div>
              <div className={styles.desktopRingLightMinis}>
                <div
                  className={[styles.desktopRingLightMini, styles.desktopRingMiniSpent].join(' ')}
                >
                  <p className={styles.desktopRingLightMiniLabel}>💸 Gastado</p>
                  <p
                    className={[styles.desktopRingLightMiniValue, styles.desktopRingMiniRed].join(
                      ' '
                    )}
                  >
                    {formatAmount(spent, cur)}
                  </p>
                </div>
                <div className={styles.desktopRingLightMini}>
                  <p className={styles.desktopRingLightMiniLabel}>💰 Ingreso</p>
                  <p className={styles.desktopRingLightMiniValue}>{formatAmount(income, cur)}</p>
                </div>
                <div className={styles.desktopRingLightMini}>
                  <p className={styles.desktopRingLightMiniLabel}>🐷 Ahorrado</p>
                  <p
                    className={[styles.desktopRingLightMiniValue, styles.desktopRingMiniGreen].join(
                      ' '
                    )}
                  >
                    {formatAmount(saved, cur)}
                  </p>
                </div>
              </div>
            </div>
            {rate > 0 && (
              <div className={styles.desktopProjectionCard}>
                <p className={styles.desktopProjectionTitle}>📈 Proyección de ahorro</p>
                <p className={styles.desktopProjectionText}>
                  Si mantenés este ritmo, en 6 meses tenés{' '}
                  <strong className={styles.desktopProjectionAmt}>
                    {formatAmount(saved * 6, cur)}
                  </strong>{' '}
                  extra
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop comparativas — full width */}
      <div className={styles.desktopComparativasCard}>
        <h3 className={styles.desktopCardTitle}>📊 Comparativas</h3>
        <div
          className={
            currencyFilter === ''
              ? styles.desktopComparativasGrid
              : styles.desktopComparativasGridSingle
          }
        >
          {(
            [
              {
                currency: Currency.USD,
                total: metrics.totalUsd,
                prevPct: usdDeltaPct,
                avgPct: usdVsAvgPct,
                bgt: budget?.usd,
                flag: '🇺🇸',
              },
              {
                currency: Currency.UYU,
                total: metrics.totalUyu,
                prevPct: uyuDeltaPct,
                avgPct: uyuVsAvgPct,
                bgt: budget?.uyu,
                flag: '🇺🇾',
              },
            ] as const
          )
            .filter(
              ({ currency }) => currencyFilter === '' || currencyFilter === currency.toLowerCase()
            )
            .map(({ currency, total, prevPct, avgPct, bgt, flag }) => {
              return (
                <div key={currency} className={styles.compareBlock}>
                  <div className={styles.compareHeader}>
                    <span className={styles.compareFlag}>
                      {flag} {currency}
                    </span>
                    <span className={styles.compareTotal}>{formatAmount(total, currency)}</span>
                  </div>
                  <div className={styles.compareBadges}>
                    <div className={styles.compareStat}>
                      <span className={styles.compareStatLbl}>vs período anterior</span>
                      <span
                        className={[
                          styles.delta,
                          prevPct > 0
                            ? styles.deltaUp
                            : prevPct < 0
                              ? styles.deltaDown
                              : styles.deltaNeutral,
                        ].join(' ')}
                      >
                        {prevPct > 0 ? '↑' : prevPct < 0 ? '↓' : '='} {Math.abs(prevPct)}%
                      </span>
                    </div>
                    <div className={styles.compareStat}>
                      <span className={styles.compareStatLbl}>vs promedio histórico</span>
                      <span
                        className={[
                          styles.delta,
                          avgPct > 0
                            ? styles.deltaUp
                            : avgPct < 0
                              ? styles.deltaDown
                              : styles.deltaNeutral,
                        ].join(' ')}
                      >
                        {avgPct > 0 ? '↑' : avgPct < 0 ? '↓' : '='} {Math.abs(avgPct)}%
                      </span>
                    </div>
                  </div>
                  {bgt && bgt > 0 && (
                    <div className={styles.budgetRow}>
                      <BudgetBar spent={total} budget={bgt} currency={currency} />
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Sugerencias de recorte — siguen el filtro de período de la página */}
      <SavingsSuggestionsCard
        period={period}
        currencyFilter={currencyFilter}
        scopeLabel="Según el período seleccionado"
      />

      {/* Desktop fijos vs variables */}
      <div className={styles.desktopSplitCard}>
        <h3 className={styles.desktopCardTitle}>⚖️ Fijos vs Variables</h3>
        <div
          className={currencyFilter === '' ? styles.desktopSplitInner2 : styles.desktopSplitInner1}
        >
          {[
            { cur: Currency.USD, fixedAmt: monthlyFixedUsd, varAmt: metrics.variableUsd },
            { cur: Currency.UYU, fixedAmt: monthlyFixedUyu, varAmt: metrics.variableUyu },
          ]
            .filter(({ cur }) => currencyFilter === '' || currencyFilter === cur.toLowerCase())
            .map(({ cur, fixedAmt, varAmt }) => (
              <div key={cur} className={styles.desktopSplitBlock}>
                <p className={styles.desktopSplitCurLabel}>{cur}</p>
                {fixedAmt === 0 && varAmt === 0 ? (
                  <p className={styles.trendEmpty}>Sin gastos en {cur} para este período.</p>
                ) : (
                  <SplitDonut fixed={fixedAmt} variable={varAmt} currency={cur} />
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Desktop 2-column grid */}
      <div className={styles.desktopGrid2}>
        {/* Col 1: Por categoría */}
        <div className={styles.desktopCatCard}>
          <h3 className={styles.desktopCardTitle}>Gasto por categoría</h3>
          <DistributionChart rows={categoryRows} currencyFilter={currencyFilter} />
        </div>

        {/* Col 2: Por categoría de producto */}
        <div className={styles.desktopCatCard}>
          <h3 className={styles.desktopCardTitle}>Gasto por producto</h3>
          <DistributionChart rows={productRows} currencyFilter={currencyFilter} />
        </div>

        {/* Col 3: Por local */}
        <div className={styles.desktopCatCard}>
          <h3 className={styles.desktopCardTitle}>Gasto por local</h3>
          <DistributionChart rows={placeRows} currencyFilter={currencyFilter} />
        </div>

      </div>
    </div>
  )
}
