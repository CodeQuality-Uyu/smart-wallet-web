// src/pages/MetricsPage.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl, PeriodDescription } from '@/components/ui/PeriodControl'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatAmount } from '@/utils/formatCurrency'
import { PeriodFilter, Currency, RecurringFrequency } from '@/types/enums'
import styles from './MetricsPage.module.css'
import { CURRENCY_OPTIONS } from '../constants/currencyOptions'
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

function fmtShort(n: number): string {
  if (n === 0) return ''
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

export default function MetricsPage(): React.ReactElement {
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [currencyFilter, setCurrencyFilter] = useState<Currency | ''>('')
  const [activeCatId, setActiveCatId] = useState<string>('')
  const { data: metrics, isLoading, error, refetch } = useMetrics(period)
  const { data: budget } = useBudget()
  const { data: categories } = useCategories()
  const { data: productCategories } = useProductCategories()

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

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
    .reduce((s, i) => s + (i.frequency === RecurringFrequency.Annual ? i.amount / 12 : i.amount), 0)
  const monthlyFixedUyu = metrics.fixedBreakdown
    .filter((i) => i.currency === Currency.UYU)
    .reduce((s, i) => s + (i.frequency === RecurringFrequency.Annual ? i.amount / 12 : i.amount), 0)
  // Por moneda
  const totalUsdAll = monthlyFixedUsd + metrics.variableUsd
  const fixedPctUsd = totalUsdAll > 0 ? Math.round((monthlyFixedUsd / totalUsdAll) * 100) : 0
  const totalUyuAll = monthlyFixedUyu + metrics.variableUyu
  const fixedPctUyu = totalUyuAll > 0 ? Math.round((monthlyFixedUyu / totalUyuAll) * 100) : 0

  // ─── Category percentages ─────────────────────────────────
  const filteredByCategory = activeCatId
    ? metrics.byCategory.filter((c) => c.categoryId === activeCatId)
    : metrics.byCategory

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
          <p className={styles.desktopTitle}>{_monthLabel}</p>
          <PeriodDescription period={period} />
        </div>
        <div className={styles.desktopHeaderControls}>
          <PeriodControl value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Desktop currency + category chips */}
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
                gradId: 'mgUyu',
              },
              {
                cur: Currency.USD,
                income: incomeUsd,
                spent: spentUsd,
                saved: savedUsd,
                rate: rateUsd,
                gradId: 'mgUsd',
              },
            ]
          : [
              {
                cur: displayCurrency,
                income: incomeForFilter,
                spent: spentForFilter,
                saved: savedForFilter,
                rate: savingsRatePct,
                gradId: 'mgSingle',
              },
            ]
        ).map(({ cur, income, spent, saved, rate, gradId }) => (
          <div key={cur} className={styles.desktopRingCardLight}>
            <div className={styles.desktopRingLightHeader}>
              <p className={styles.desktopRingLightTitle}>🐷 Ahorro del mes · {cur}</p>
            </div>
            <div className={styles.desktopRingLightBody}>
              <div className={styles.desktopRingChartInner}>
                <svg viewBox="0 0 36 36" className={styles.desktopRingSvg}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(0,0,0,.07)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth="2.5"
                    strokeDasharray={`${Math.max(2, rate)},100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id={gradId}>
                      <stop offset="0%" stopColor="#f5b732" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className={styles.desktopRingCenter}>
                  <span className={styles.desktopRingPctLight}>{rate}%</span>
                  <span className={styles.desktopRingLabelLight}>ahorrado</span>
                </div>
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
              const budgetPct =
                bgt && bgt > 0 ? Math.min(Math.round((total / bgt) * 100), 100) : null
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
                  {bgt && bgt > 0 && budgetPct !== null && (
                    <div className={styles.budgetRow}>
                      <div className={styles.budgetLabels}>
                        <span className={styles.budgetLbl}>Presupuesto</span>
                        <span className={styles.budgetPct}>
                          {formatAmount(total, currency)} / {formatAmount(bgt, currency)} (
                          {budgetPct}%)
                        </span>
                      </div>
                      <div className={styles.budgetBar}>
                        <div
                          className={styles.budgetFill}
                          style={{
                            width: `${budgetPct}%`,
                            background:
                              budgetPct >= 100
                                ? 'var(--rose)'
                                : budgetPct >= 80
                                  ? 'var(--amb)'
                                  : 'var(--g500)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Desktop fijos vs variables */}
      <div className={styles.desktopSplitCard}>
        <h3 className={styles.desktopCardTitle}>⚖️ Fijos vs Variables</h3>
        <div
          className={currencyFilter === '' ? styles.desktopSplitInner2 : styles.desktopSplitInner1}
        >
          {[
            {
              cur: Currency.USD,
              fixedAmt: monthlyFixedUsd,
              varAmt: metrics.variableUsd,
              pct: fixedPctUsd,
            },
            {
              cur: Currency.UYU,
              fixedAmt: monthlyFixedUyu,
              varAmt: metrics.variableUyu,
              pct: fixedPctUyu,
            },
          ]
            .filter(({ cur }) => currencyFilter === '' || currencyFilter === cur.toLowerCase())
            .map(({ cur, fixedAmt, varAmt, pct }) => (
              <div key={cur} className={styles.desktopSplitBlock}>
                <p className={styles.desktopSplitCurLabel}>{cur}</p>
                {fixedAmt === 0 && varAmt === 0 ? (
                  <p className={styles.trendEmpty}>Sin gastos en {cur} para este período.</p>
                ) : (
                  <div className={styles.desktopSplitBars}>
                    <div className={styles.desktopSplitBarRow}>
                      <div className={styles.splitBar}>
                        <div className={styles.splitFixed} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.desktopSplitBarRowMeta}>
                        <div className={styles.splitItem}>
                          <span className={styles.splitDot} style={{ background: '#7c3aed' }} />
                          <span className={styles.splitLbl}>
                            Fijos{' '}
                            <span className={styles.splitLblNote}>(mensuales + anuales ÷ 12)</span>
                          </span>
                          <span className={styles.splitPct}>{pct}%</span>
                        </div>
                        <span className={styles.splitAmtVal} style={{ color: '#7c3aed' }}>
                          {formatAmount(fixedAmt, cur)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.desktopSplitBarRow}>
                      <div className={styles.splitBar}>
                        <div
                          className={styles.splitFixed}
                          style={{ width: `${100 - pct}%`, background: 'var(--g400)' }}
                        />
                      </div>
                      <div className={styles.desktopSplitBarRowMeta}>
                        <div className={styles.splitItem}>
                          <span className={styles.splitDot} style={{ background: 'var(--g400)' }} />
                          <span className={styles.splitLbl}>Variables</span>
                          <span className={styles.splitPct}>{100 - pct}%</span>
                        </div>
                        <span className={styles.splitAmtVal}>{formatAmount(varAmt, cur)}</span>
                      </div>
                    </div>
                  </div>
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
          {filteredByCategory.length === 0 ? (
            <p className={styles.trendEmpty}>Sin datos de categorías para este período.</p>
          ) : (
            filteredByCategory.map((cat) => {
              const catColor =
                categories?.find((c) => c.id === cat.categoryId)?.color ?? 'var(--g500)'
              const maxUsd = Math.max(...filteredByCategory.map((c) => c.usd), 1)
              const maxUyu = Math.max(...filteredByCategory.map((c) => c.uyu), 1)
              const pctUsd = Math.round((cat.usd / maxUsd) * 100)
              const pctUyu = Math.round((cat.uyu / maxUyu) * 100)
              const showBoth = currencyFilter === ''

              return (
                <div key={cat.categoryId} className={styles.desktopCatRow}>
                  <span className={styles.desktopCatName}>
                    {cat.categoryIcon} {cat.categoryName}
                  </span>
                  {showBoth ? (
                    <div className={styles.desktopCatBars}>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{ width: `${pctUyu}%`, background: catColor }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {formatAmount(cat.uyu, Currency.UYU)}
                        </span>
                        <span className={styles.desktopCatCurBadge}>UYU</span>
                      </div>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{ width: `${pctUsd}%`, background: catColor }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {formatAmount(cat.usd, Currency.USD)}
                        </span>
                        <span className={styles.desktopCatCurBadge}>USD</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.desktopCatBars}>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{
                              width: `${currencyFilter === Currency.USD ? pctUsd : pctUyu}%`,
                              background: catColor,
                            }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {currencyFilter === Currency.USD
                            ? formatAmount(cat.usd, Currency.USD)
                            : formatAmount(cat.uyu, Currency.UYU)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Col 2: Por categoría de producto */}
        <div className={styles.desktopCatCard}>
          <h3 className={styles.desktopCardTitle}>Gasto por producto</h3>
          {metrics.byProductCategory.length === 0 ? (
            <p className={styles.trendEmpty}>Sin datos de productos para este período.</p>
          ) : (
            metrics.byProductCategory.map((pcat) => {
              const pcatColor =
                productCategories?.find((c) => c.id === pcat.productCategoryId)?.color ??
                'var(--g500)'
              const maxUsd = Math.max(...metrics.byProductCategory.map((c) => c.usd), 1)
              const maxUyu = Math.max(...metrics.byProductCategory.map((c) => c.uyu), 1)
              const pctUsd = Math.round((pcat.usd / maxUsd) * 100)
              const pctUyu = Math.round((pcat.uyu / maxUyu) * 100)
              const showBoth = currencyFilter === ''
              return (
                <div key={pcat.productCategoryId} className={styles.desktopCatRow}>
                  <span className={styles.desktopCatName}>
                    {pcat.productCategoryIcon} {pcat.productCategoryName}
                  </span>
                  {showBoth ? (
                    <div className={styles.desktopCatBars}>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{ width: `${pctUyu}%`, background: pcatColor }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {formatAmount(pcat.uyu, Currency.UYU)}
                        </span>
                        <span className={styles.desktopCatCurBadge}>UYU</span>
                      </div>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{ width: `${pctUsd}%`, background: pcatColor }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {formatAmount(pcat.usd, Currency.USD)}
                        </span>
                        <span className={styles.desktopCatCurBadge}>USD</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.desktopCatBars}>
                      <div className={styles.desktopCatBarRow}>
                        <div className={styles.desktopCatBar}>
                          <div
                            className={styles.desktopCatBarFill}
                            style={{
                              width: `${currencyFilter === Currency.USD ? pctUsd : pctUyu}%`,
                              background: pcatColor,
                            }}
                          />
                        </div>
                        <span className={styles.desktopCatAmt}>
                          {currencyFilter === Currency.USD
                            ? formatAmount(pcat.usd, Currency.USD)
                            : formatAmount(pcat.uyu, Currency.UYU)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Col 3: Tendencia mensual */}
        <div className={styles.desktopTrendCard}>
          <h3 className={styles.desktopCardTitle}>📈 Tendencia mensual</h3>
          <div className={styles.trendLegend}>
            <span className={styles.trendLegendItem}>
              <span className={styles.trendLegendDot} style={{ background: '#7c3aed' }} />
              Fijos
            </span>
            <span className={styles.trendLegendItem}>
              <span className={styles.trendLegendDot} style={{ background: 'var(--g500)' }} />
              Variables
            </span>
          </div>
          {metrics.monthlyHistory.length === 0 ? (
            <p className={styles.trendEmpty}>No hay datos históricos para mostrar.</p>
          ) : (
            <>
              {(() => {
                const showUsd = currencyFilter === '' || currencyFilter === Currency.USD
                const showUyu = currencyFilter === '' || currencyFilter === Currency.UYU
                const maxUsd = Math.max(...metrics.monthlyHistory.map((m) => m.usd), 1)
                const maxUyu = Math.max(...metrics.monthlyHistory.map((m) => m.uyu), 1)

                return metrics.monthlyHistory.map((m, i) => {
                  const prev = metrics.monthlyHistory[i - 1]
                  const isLast = i === metrics.monthlyHistory.length - 1
                  const usdPct =
                    prev && prev.usd > 0 ? Math.round(((m.usd - prev.usd) / prev.usd) * 100) : null
                  const uyuPct =
                    prev && prev.uyu > 0 ? Math.round(((m.uyu - prev.uyu) / prev.uyu) * 100) : null

                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      className={[styles.trendRow, isLast ? styles.trendRowCurrent : ''].join(' ')}
                    >
                      <span className={styles.trendMonth}>{m.label}</span>
                      <div className={styles.trendBars}>
                        {showUsd && (
                          <div className={styles.trendBarWrap}>
                            <div
                              className={styles.trendBarStacked}
                              style={{ width: `${(m.usd / maxUsd) * 100}%` }}
                            >
                              <div
                                className={styles.trendBarSegment}
                                style={{
                                  flex: m.fixedUsd,
                                  background: isLast ? '#7c3aed' : '#c4b5fd',
                                }}
                              />
                              <div
                                className={styles.trendBarSegment}
                                style={{
                                  flex: m.variableUsd,
                                  background: isLast ? 'var(--g600)' : 'var(--g300)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {showUyu && (
                          <div className={styles.trendBarWrap}>
                            <div
                              className={styles.trendBarStacked}
                              style={{ width: `${(m.uyu / maxUyu) * 100}%` }}
                            >
                              <div
                                className={styles.trendBarSegment}
                                style={{
                                  flex: m.fixedUyu,
                                  background: isLast ? '#7c3aed' : '#c4b5fd',
                                }}
                              />
                              <div
                                className={styles.trendBarSegment}
                                style={{
                                  flex: m.variableUyu,
                                  background: isLast ? 'var(--g600)' : 'var(--g300)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.trendAmts}>
                        {showUsd && (
                          <span className={styles.trendAmt} style={{ color: '#7c3aed' }}>
                            {fmtShort(m.usd) || '—'}
                            <span className={styles.trendCurrency}>USD</span>
                            {usdPct !== null && (
                              <span
                                className={[
                                  styles.trendDelta,
                                  usdPct > 0
                                    ? styles.deltaUp
                                    : usdPct < 0
                                      ? styles.deltaDown
                                      : styles.deltaNeutral,
                                ].join(' ')}
                              >
                                {usdPct > 0 ? '↑' : usdPct < 0 ? '↓' : '='}
                                {Math.abs(usdPct)}%
                              </span>
                            )}
                          </span>
                        )}
                        {showUyu && (
                          <span className={styles.trendAmt} style={{ color: 'var(--g600)' }}>
                            {fmtShort(m.uyu) || '—'}
                            <span className={styles.trendCurrency}>UYU</span>
                            {uyuPct !== null && (
                              <span
                                className={[
                                  styles.trendDelta,
                                  uyuPct > 0
                                    ? styles.deltaUp
                                    : uyuPct < 0
                                      ? styles.deltaDown
                                      : styles.deltaNeutral,
                                ].join(' ')}
                              >
                                {uyuPct > 0 ? '↑' : uyuPct < 0 ? '↓' : '='}
                                {Math.abs(uyuPct)}%
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
                  {(currencyFilter === '' || currencyFilter === Currency.USD) &&
                    `${formatAmount(avgUsd, Currency.USD)} USD`}
                  {currencyFilter === '' && ' · '}
                  {(currencyFilter === '' || currencyFilter === Currency.UYU) &&
                    `${formatAmount(avgUyu, Currency.UYU)} UYU`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
