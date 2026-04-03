// src/pages/ExpensesPage.tsx

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses, useDuplicateExpense } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PeriodControl, PeriodDescription } from '@/components/ui/PeriodControl'
import { PERIODS } from '@/components/ui/PeriodControl.constants'
import {
  groupExpensesByDate,
  groupExpensesByWeek,
  groupExpensesByPlace,
  groupExpensesByCategory,
} from '@/utils/groupByDate'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { Currency, PeriodFilter, GroupBy } from '@/types/enums'
import { CURRENCY_OPTIONS } from '@/constants/currencyOptions'
import styles from './ExpensesPage.module.css'

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

const GROUP_OPTIONS = [
  { value: GroupBy.Day, label: 'Día' },
  { value: GroupBy.Week, label: 'Semana' },
  { value: GroupBy.Place, label: 'Lugar' },
  { value: GroupBy.Category, label: 'Categoría' },
]

export default function ExpensesPage(): React.ReactElement {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [search, setSearch] = useState('')
  const [filterCurrency, setFilterCurrency] = useState<Currency | ''>('')
  const [filterCardId, setFilterCardId] = useState('')
  const [filterPlaceId, setFilterPlaceId] = useState('')
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>(GroupBy.Day)
  const [showFilters, setShowFilters] = useState(false)

  const { data: page, isLoading, error, refetch } = useExpenses({ period })
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()
  const { mutateAsync: duplicate } = useDuplicateExpense()

  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`

  const filtered = useMemo(() => {
    let list = page?.data ?? []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((e) => e.description.toLowerCase().includes(q))
    }
    if (filterCurrency) list = list.filter((e) => e.currency === filterCurrency)
    if (filterCardId) list = list.filter((e) => e.cardId === filterCardId)
    if (filterPlaceId) list = list.filter((e) => e.placeId === filterPlaceId)
    if (filterCategoryIds.length > 0) {
      list = list.filter((e) => filterCategoryIds.some((id) => e.categoryIds.includes(id)))
    }
    return list
  }, [page?.data, search, filterCurrency, filterCardId, filterPlaceId, filterCategoryIds])

  const groups = useMemo(() => {
    switch (groupBy) {
      case GroupBy.Week:
        return groupExpensesByWeek(filtered)
      case GroupBy.Place:
        return groupExpensesByPlace(filtered, places)
      case GroupBy.Category:
        return groupExpensesByCategory(filtered, categories)
      default:
        return groupExpensesByDate(filtered)
    }
  }, [filtered, groupBy, places, categories])

  const totalUsd = filtered
    .filter((e) => e.currency === Currency.USD)
    .reduce((s, e) => s + e.amount, 0)
  const totalUyu = filtered
    .filter((e) => e.currency === Currency.UYU)
    .reduce((s, e) => s + e.amount, 0)

  const activeFilterCount = [
    filterCurrency !== '',
    filterCardId !== '',
    filterPlaceId !== '',
    filterCategoryIds.length > 0,
  ].filter(Boolean).length

  if (isLoading) return <LoadingSpinner fullPage />

  // ── Desktop render ────────────────────────────────────
  if (isDesktop) {
    const activeCatId = filterCategoryIds[0] ?? ''

    return (
      <div className={styles.desktopPage}>
        {/* Header row */}
        <div className={styles.desktopHeader}>
          <div className={styles.desktopHeaderLeft}>
            <p className={styles.desktopTitle}>{monthLabel}</p>
            <PeriodDescription period={period} />
          </div>
          <div className={styles.desktopSearchWrap}>
            <span className={styles.desktopSearchIcon}>🔍</span>
            <input
              className={styles.desktopSearchInput}
              placeholder="Buscar gastos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.desktopSearchClear} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>
          <div className={styles.desktopHeaderRight}>
            <PeriodControl value={period} onChange={setPeriod as never} />
            <button className={styles.desktopNewBtn} onClick={() => void navigate('/expenses/new')}>
              ＋ Nuevo gasto
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className={styles.desktopStats}>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>Total USD</p>
            <p className={styles.desktopStatValue}>
              <span className={styles.desktopAmtSymbol}>U$S </span>
              {formatAmount(totalUsd, Currency.USD).replace(/^\$/, '')}
            </p>
          </div>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>Total UYU</p>
            <p className={styles.desktopStatValue}>
              <span className={styles.desktopAmtSymbol}>$ </span>
              {formatAmount(totalUyu, Currency.UYU).replace(/^\$/, '')}
            </p>
          </div>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>📋 Transacciones</p>
            <p className={[styles.desktopStatValue, styles.desktopStatValueNeutral].join(' ')}>
              {filtered.length}
            </p>
          </div>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>📁 Grupos</p>
            <p className={[styles.desktopStatValue, styles.desktopStatValueNeutral].join(' ')}>
              {groups.length}
            </p>
          </div>
        </div>

        {/* Filter bar: moneda + agrupación */}
        <div className={styles.desktopFilterBar}>
          <div className={styles.desktopFilterSection}>
            <PeriodControl
              options={CURRENCY_OPTIONS}
              value={filterCurrency}
              onChange={setFilterCurrency}
            />
          </div>
          <div className={styles.desktopFilterSection}>
            <PeriodControl options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
          </div>
        </div>

        {/* Category chips */}
        <div className={styles.desktopCatChips}>
          <button
            className={[
              styles.desktopCatChip,
              activeCatId === '' ? styles.desktopCatChipActive : '',
            ].join(' ')}
            onClick={() => setFilterCategoryIds([])}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={[
                styles.desktopCatChip,
                activeCatId === cat.id ? styles.desktopCatChipActive : '',
              ].join(' ')}
              onClick={() => setFilterCategoryIds(activeCatId === cat.id ? [] : [cat.id])}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className={styles.desktopTableWrap}>
          <table className={styles.desktopTable}>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Medio de pago</th>
                <th>Fecha</th>
                <th className={styles.desktopThRight}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.desktopEmpty}>
                    No hay gastos en este período.
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const gUsd = group.expenses
                    .filter((e) => e.currency === Currency.USD)
                    .reduce((s, e) => s + e.amount, 0)
                  const gUyu = group.expenses
                    .filter((e) => e.currency === Currency.UYU)
                    .reduce((s, e) => s + e.amount, 0)
                  return (
                    <React.Fragment key={group.date}>
                      <tr className={styles.desktopGroupRow}>
                        <td colSpan={4} className={styles.desktopGroupLabel}>
                          {group.label}
                        </td>
                        <td className={styles.desktopGroupTotal}>
                          {gUsd > 0 && (
                            <span className={styles.groupTotalItem}>
                              <span className={styles.groupTotalAmt}>
                                U$S {formatAmount(gUsd, Currency.USD).replace(/^[^\d]*/, '')}
                              </span>
                              <span className={styles.groupTotalBadge}>USD</span>
                            </span>
                          )}
                          {gUsd > 0 && gUyu > 0 && (
                            <span className={styles.desktopGroupDot}> · </span>
                          )}
                          {gUyu > 0 && (
                            <span className={styles.groupTotalItem}>
                              <span className={styles.groupTotalAmt}>
                                $ {formatAmount(gUyu, Currency.UYU).replace(/^[^\d]*/, '')}
                              </span>
                              <span className={styles.groupTotalBadge}>UYU</span>
                            </span>
                          )}
                        </td>
                      </tr>
                      {group.expenses.map((expense) => {
                        const expCats = categories.filter((c) => expense.categoryIds.includes(c.id))
                        const card = cards.find((c) => c.id === expense.cardId)
                        const firstCat = expCats[0]
                        const dateStr = new Date(`${expense.date}T12:00:00`).toLocaleDateString(
                          'es-UY',
                          { day: 'numeric', month: 'short' }
                        )
                        return (
                          <tr
                            key={expense.id}
                            className={styles.desktopRow}
                            onClick={() => void navigate(`/expenses/${expense.id}`)}
                          >
                            <td className={styles.desktopTdDesc}>
                              <span className={styles.desktopRowEmoji}>
                                {firstCat?.icon ?? '💸'}
                              </span>
                              {expense.description}
                            </td>
                            <td>
                              {expCats.map((c) => (
                                <span key={c.id} className={styles.desktopCatBadge}>
                                  {c.name}
                                </span>
                              ))}
                            </td>
                            <td className={styles.desktopTdMuted}>
                              {card
                                ? `${card.type === 'credit' ? 'Crédito' : card.type === 'debit' ? 'Débito' : 'Transferencia'} ${card.bank}`
                                : '—'}
                            </td>
                            <td className={styles.desktopTdMuted}>{dateStr}</td>
                            <td className={styles.desktopTdAmt}>
                              <p className={styles.desktopAmt}>
                                {expense.currency === Currency.USD ? 'U$S' : '$'}{' '}
                                {formatCurrency(expense.amount, expense.currency).replace(
                                  /^[^\d]*/,
                                  ''
                                )}
                              </p>
                              <p className={styles.desktopAmtCurr}>{expense.currency}</p>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function clearFilters(): void {
    setFilterCurrency('')
    setFilterCardId('')
    setFilterPlaceId('')
    setFilterCategoryIds([])
  }

  async function handleDuplicate(id: string): Promise<void> {
    await duplicate(id)
  }

  return (
    <div className={styles.page}>
      {/* Sticky top section */}
      <div className={styles.stickyTop}>
        {/* Month + range header */}
        <div className={styles.mobileHeader}>
          <p className={styles.mobileMonthLabel}>{monthLabel}</p>
          <PeriodDescription period={period} />
        </div>

        {/* Search bar */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Buscar gastos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Period tabs + filter toggle */}
        <div className={styles.topBar}>
          <div className={styles.tabs} role="tablist" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                className={[styles.tab, period === p.value ? styles.tabActive : ''].join(' ')}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            className={[styles.filterBtn, activeFilterCount > 0 ? styles.filterBtnActive : ''].join(
              ' '
            )}
            onClick={() => setShowFilters((v) => !v)}
          >
            ⚙{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterRow}>
            <span className={styles.filterLbl}>Moneda</span>
            <div className={styles.filterChips}>
              {(['', Currency.USD, Currency.UYU] as const).map((c) => (
                <button
                  key={c || 'all'}
                  className={[styles.chip, filterCurrency === c ? styles.chipActive : ''].join(' ')}
                  onClick={() => setFilterCurrency(c)}
                >
                  {c || 'Todas'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterLbl}>Medio de pago</span>
            <select
              className={styles.filterSelect}
              value={filterCardId}
              onChange={(e) => setFilterCardId(e.target.value)}
            >
              <option value="">Todos</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank} ···· {c.lastFour ?? '—'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterLbl}>Comercio</span>
            <select
              className={styles.filterSelect}
              value={filterPlaceId}
              onChange={(e) => setFilterPlaceId(e.target.value)}
            >
              <option value="">Todos</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterLbl}>Categoría</span>
            <CategoryChips
              categories={categories}
              selected={filterCategoryIds}
              onChange={setFilterCategoryIds}
            />
          </div>

          {activeFilterCount > 0 && (
            <button className={styles.clearBtn} onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Group by selector */}
      <div className={styles.groupByBar}>
        <PeriodControl options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
      </div>

      {/* Totals */}
      <div className={styles.totals}>
        <div className={styles.totalChip}>
          <div className={styles.totalLabelRow}>
            <span className={styles.totalCurrBadge}>USD</span>
          </div>
          <p className={styles.totalAmt}>
            <span className={styles.totalSymbol}>U$S </span>
            {formatAmount(totalUsd, Currency.USD).replace(/^\$/, '')}
          </p>
        </div>
        <div className={styles.totalChip}>
          <div className={styles.totalLabelRow}>
            <span className={styles.totalCurrBadge}>UYU</span>
          </div>
          <p className={styles.totalAmt}>
            <span className={styles.totalSymbol}>$ </span>
            {formatAmount(totalUyu, Currency.UYU).replace(/^\$/, '')}
          </p>
        </div>
      </div>

      {error && <ErrorMessage onRetry={() => void refetch()} />}

      {!error && groups.length === 0 && (
        <p className={styles.empty}>
          {search || activeFilterCount > 0
            ? 'No hay gastos con esos filtros.'
            : 'No hay gastos en este período.'}
        </p>
      )}

      {/* Expense groups */}
      {groups.map((group) => {
        const gUsd = group.expenses
          .filter((e) => e.currency === Currency.USD)
          .reduce((s, e) => s + e.amount, 0)
        const gUyu = group.expenses
          .filter((e) => e.currency === Currency.UYU)
          .reduce((s, e) => s + e.amount, 0)
        return (
          <div key={group.date}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>{group.label}</span>
              <span className={styles.groupTotal}>
                {gUsd > 0 && (
                  <span className={styles.groupTotalItem}>
                    <span className={styles.groupTotalAmt}>
                      U$S {formatAmount(gUsd, Currency.USD).replace(/^[^\d]*/, '')}
                    </span>
                    <span className={styles.groupTotalBadge}>USD</span>
                  </span>
                )}
                {gUsd > 0 && gUyu > 0 && <span className={styles.dot}>·</span>}
                {gUyu > 0 && (
                  <span className={styles.groupTotalItem}>
                    <span className={styles.groupTotalAmt}>
                      $ {formatAmount(gUyu, Currency.UYU).replace(/^[^\d]*/, '')}
                    </span>
                    <span className={styles.groupTotalBadge}>UYU</span>
                  </span>
                )}
              </span>
            </div>
            {group.expenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                categories={categories}
                onDuplicate={(id) => void handleDuplicate(id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
