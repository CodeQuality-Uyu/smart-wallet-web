// src/pages/ReportsPage.tsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMonthClosings } from '@/hooks/useMonthClosings'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatAmount } from '@/utils/formatCurrency'
import { Currency, PeriodFilter, RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import styles from './ReportsPage.module.css'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ReportsPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: closings = [], isLoading: loadingClosings } = useMonthClosings()
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  const selectedYearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const { data: metrics } = useMetrics(PeriodFilter.Month, selectedYearMonth)
  const { data: budget } = useBudget()
  const { data: categories } = useCategories()
  const { data: productCategories } = useProductCategories()
  const { data: expensesData } = useExpenses({ period: selectedYearMonth })
  const { data: places } = usePlaces()

  // Category data from metrics, sorted by total desc — must be before early return
  const sortedCategories = useMemo(() => {
    if (!metrics?.byCategory) return []
    return [...metrics.byCategory].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [metrics?.byCategory])

  const sortedProductCategories = useMemo(() => {
    if (!metrics?.byProductCategory) return []
    return [...metrics.byProductCategory].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [metrics?.byProductCategory])

  // Gasto por local — computed from expenses
  const sortedByPlace = useMemo(() => {
    const expenses = expensesData?.data ?? []
    const map = new Map<string, { placeId: string; uyu: number; usd: number }>()
    for (const exp of expenses) {
      if (!exp.placeId) continue
      const entry = map.get(exp.placeId) ?? { placeId: exp.placeId, uyu: 0, usd: 0 }
      if (exp.currency === Currency.UYU) entry.uyu += exp.amount
      else if (exp.currency === Currency.USD) entry.usd += exp.amount
      map.set(exp.placeId, entry)
    }
    return [...map.values()].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [expensesData])

  if (loadingClosings || loadingRecurring) return <LoadingSpinner fullPage />

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`
  const currentClosing = closings.find((c) => c.id === currentYearMonth)

  // Build list of past months without a closing (up to 6 months back)
  const pendingMonths: { id: string; year: number; month: number; label: string }[] = []
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!closings.find((c) => c.id === id)) {
      pendingMonths.push({
        id,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getFullYear()}`,
      })
    }
  }

  const pendingRecurring = recurring.filter(
    (r) => r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending,
  )

  // Build 6 visible month pills (ending at current month)
  const visibleMonths: { month: number; year: number; id: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    visibleMonths.push({ month: d.getMonth(), year: d.getFullYear(), id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }

  // Check if pills span multiple years
  const yearsInPills = new Set(visibleMonths.map((m) => m.year))
  const showYearInPills = yearsInPills.size > 1

  const maxCatUyu = Math.max(...sortedCategories.map((c) => c.uyu), 1)
  const maxCatUsd = Math.max(...sortedCategories.map((c) => c.usd), 1)

  // Totals
  const totalUyu = metrics?.totalUyu ?? 0
  const totalUsd = metrics?.totalUsd ?? 0
  const incomeUyu = budget?.uyu ?? 0
  const savedUyu = Math.max(0, incomeUyu - totalUyu)

  function prevMonth() {
    const d = new Date(selectedYear, selectedMonth - 1, 1)
    setSelectedYear(d.getFullYear())
    setSelectedMonth(d.getMonth())
  }
  function nextMonth() {
    const d = new Date(selectedYear, selectedMonth + 1, 1)
    if (d <= now) {
      setSelectedYear(d.getFullYear())
      setSelectedMonth(d.getMonth())
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Mobile header ── */}
      <div className={styles.mobileHeader}>
        <PageHeader title="Reportes" subtitle="Cierres mensuales e historial de gastos" />
      </div>

      {/* ── Desktop header ── */}
      <div className={styles.desktopHeader}>
        <div className={styles.desktopHeaderLeft}>
          <h1 className={styles.desktopTitle}>Reportes mensuales</h1>
          <p className={styles.desktopSubtitle}>Mirá el resumen de gastos de cada mes</p>
        </div>
        <button className={styles.exportBtn}>Exportar PDF</button>
      </div>

      {/* ── Desktop month selector ── */}
      <div className={styles.monthSelector}>
        <button className={styles.navArrow} onClick={prevMonth}>‹</button>
        <div className={styles.monthPills}>
          {visibleMonths.map((m) => (
            <button
              key={m.id}
              className={`${styles.monthPill} ${m.month === selectedMonth && m.year === selectedYear ? styles.monthPillActive : ''}`}
              onClick={() => { setSelectedYear(m.year); setSelectedMonth(m.month) }}
            >
              {MONTH_SHORT[m.month]}
              {showYearInPills && <span className={styles.monthPillYear}>{m.year}</span>}
            </button>
          ))}
        </div>
        <button
          className={styles.navArrow}
          onClick={nextMonth}
          disabled={selectedMonth === now.getMonth() && selectedYear === now.getFullYear()}
        >›</button>
      </div>

      {/* ── Desktop stat cards ── */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total gastado en UYU</p>
          <p className={styles.statValue}>{formatAmount(totalUyu, Currency.UYU)}</p>
          <span className={styles.statBadge}>UYU</span>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total gastado en USD</p>
          <p className={styles.statValue}>{formatAmount(totalUsd, Currency.USD)}</p>
          <span className={styles.statBadgeGold}>USD</span>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total ahorrado</p>
          <p className={`${styles.statValue} ${styles.statValueGreen}`}>
            {formatAmount(savedUyu, Currency.UYU)}
          </p>
        </div>
      </div>

      {/* ── Category chart (full-width, bars like MetricsPage) ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por categoría</p>
        {sortedCategories.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de categorías para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {sortedCategories.map((cat) => {
              const catColor = categories?.find((c) => c.id === cat.categoryId)?.color ?? 'var(--g500)'
              const pctUyu = Math.round((cat.uyu / maxCatUyu) * 100)
              const pctUsd = Math.round((cat.usd / maxCatUsd) * 100)
              return (
                <div key={cat.categoryId} className={styles.catRow}>
                  <span className={styles.catName}>{cat.categoryIcon} {cat.categoryName}</span>
                  <div className={styles.catBars}>
                    <div className={styles.catBarRow}>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${pctUyu}%`, background: catColor }} />
                      </div>
                      <span className={styles.catAmt}>{formatAmount(cat.uyu, Currency.UYU)}</span>
                      <span className={styles.catCurBadge}>UYU</span>
                    </div>
                    <div className={styles.catBarRow}>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${pctUsd}%`, background: catColor }} />
                      </div>
                      <span className={styles.catAmt}>{formatAmount(cat.usd, Currency.USD)}</span>
                      <span className={styles.catCurBadge}>USD</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Product category chart ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por producto</p>
        {sortedProductCategories.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de productos para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {(() => {
              const maxPcUyu = Math.max(...sortedProductCategories.map((c) => c.uyu), 1)
              const maxPcUsd = Math.max(...sortedProductCategories.map((c) => c.usd), 1)
              return sortedProductCategories.map((pcat) => {
                const pcatColor = productCategories?.find((c) => c.id === pcat.productCategoryId)?.color ?? 'var(--g500)'
                const pctUyu = Math.round((pcat.uyu / maxPcUyu) * 100)
                const pctUsd = Math.round((pcat.usd / maxPcUsd) * 100)
                return (
                  <div key={pcat.productCategoryId} className={styles.catRow}>
                    <span className={styles.catName}>{pcat.productCategoryIcon} {pcat.productCategoryName}</span>
                    <div className={styles.catBars}>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${pctUyu}%`, background: pcatColor }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pcat.uyu, Currency.UYU)}</span>
                        <span className={styles.catCurBadge}>UYU</span>
                      </div>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${pctUsd}%`, background: pcatColor }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pcat.usd, Currency.USD)}</span>
                        <span className={styles.catCurBadge}>USD</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* ── Place chart ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por local</p>
        {sortedByPlace.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de locales para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {(() => {
              const maxPlUyu = Math.max(...sortedByPlace.map((c) => c.uyu), 1)
              const maxPlUsd = Math.max(...sortedByPlace.map((c) => c.usd), 1)
              return sortedByPlace.map((pl) => {
                const place = places?.find((p) => p.id === pl.placeId)
                const placeName = place?.name ?? 'Sin local'
                const placeIcon = place?.icon ?? '📍'
                return (
                  <div key={pl.placeId} className={styles.catRow}>
                    <span className={styles.catName}>{placeIcon} {placeName}</span>
                    <div className={styles.catBars}>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pl.uyu / maxPlUyu) * 100)}%`, background: 'var(--g500)' }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pl.uyu, Currency.UYU)}</span>
                        <span className={styles.catCurBadge}>UYU</span>
                      </div>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pl.usd / maxPlUsd) * 100)}%`, background: 'var(--g500)' }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pl.usd, Currency.USD)}</span>
                        <span className={styles.catCurBadge}>USD</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* ── Mobile body ── */}
      <div className={`${styles.body} ${styles.mobileOnly}`}>
        {/* ── Mes actual ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Mes actual</p>
          <button
            className={styles.currentCard}
            onClick={() => navigate(`/settings/reports/${currentYearMonth}`)}
          >
            <div className={styles.currentLeft}>
              <p className={styles.currentMonth}>{monthLabel}</p>
              {currentClosing ? (
                <p className={styles.statusClosed}>
                  ✓ Cerrado el {new Date(currentClosing.closedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })}
                </p>
              ) : pendingRecurring.length > 0 ? (
                <p className={styles.statusPending}>
                  ⚠️ {pendingRecurring.length} pago{pendingRecurring.length > 1 ? 's' : ''} manual{pendingRecurring.length > 1 ? 'es' : ''} pendiente{pendingRecurring.length > 1 ? 's' : ''}
                </p>
              ) : (
                <p className={styles.statusReady}>✅ Listo para cerrar</p>
              )}
            </div>
            <span className={styles.arrow}>
              {currentClosing ? 'Ver →' : 'Generar →'}
            </span>
          </button>
        </div>

        {/* ── Historial (mobile) ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Historial</p>
          {pendingMonths.map((pm) => (
            <button
              key={pm.id}
              className={styles.row}
              onClick={() => navigate(`/settings/reports/${pm.id}`)}
            >
              <div className={styles.rowLeft}>
                <p className={styles.rowMonth}>{pm.label}</p>
                <p className={styles.statusPending}>⚠️ Pendiente de cierre</p>
              </div>
              <span className={styles.arrow}>Generar →</span>
            </button>
          ))}
          {pendingMonths.length === 0 && (
            <p className={styles.empty}>No hay cierres anteriores registrados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
