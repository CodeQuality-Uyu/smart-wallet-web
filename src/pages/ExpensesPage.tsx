// src/pages/ExpensesPage.tsx

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl, PeriodDescription } from '@/components/ui/PeriodControl'
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
  const navigate = useNavigate()
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [search, setSearch] = useState('')
  const [filterCurrency, setFilterCurrency] = useState<Currency | ''>('')
  const [filterCardId] = useState('')
  const [filterPlaceId] = useState('')
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>(GroupBy.Day)

  const { data: page, isLoading } = useExpenses({ period })
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()

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

  if (isLoading) return <LoadingSpinner fullPage />

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
              filterCategoryIds.length === 0 ? styles.desktopCatChipActive : '',
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
                filterCategoryIds.includes(cat.id) ? styles.desktopCatChipActive : '',
              ].join(' ')}
              onClick={() => {
                const next = filterCategoryIds.includes(cat.id)
                  ? filterCategoryIds.filter((id) => id !== cat.id)
                  : [...filterCategoryIds, cat.id]
                setFilterCategoryIds(next.length === categories.length ? [] : next)
              }}
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
                            onClick={() => void navigate(`/expenses/${expense.id}`, { state: { period, filterCurrency, filterCategoryIds } })}
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
