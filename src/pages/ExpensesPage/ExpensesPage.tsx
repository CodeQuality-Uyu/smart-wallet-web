// src/pages/ExpensesPage.tsx

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useExpenses,
  useUpdateExpense,
  useDeleteExpense,
  useUpdateInstallmentGroup,
  useDeleteInstallmentGroup,
} from '@/features/expenses/hooks/useExpenses'
import { ReportOriginBadge } from '@/features/expenses/components/ReportOriginBadge'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import {
  InstallmentScopeChoice,
  type InstallmentScope,
} from '@/features/expenses/components/InstallmentScopeChoice'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { UpdateExpensePayload } from '@/types/models'
import { expensesService } from '@/services/expensesService'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { KebabMenu, type KebabMenuItem } from '@/components/shared/KebabMenu'
import { PeriodControl, PeriodDescription } from '@/components/ui/PeriodControl'
import {
  groupExpensesByDate,
  groupExpensesByWeek,
  groupExpensesByPlace,
  groupExpensesByCategory,
} from '@/utils/groupByDate'
import { formatCurrency, formatAmountNoSymbol } from '@/utils/formatCurrency'
import { Currency, PeriodFilter, GroupBy, ReceiptStatus } from '@/types/enums'
import { CURRENCY_OPTIONS } from '@/constants/currencyOptions'
import { usePendingReceipts, useDeletePendingReceipt } from '@/features/pendingReceipts/hooks/usePendingReceipts'
import type { Expense } from '@/types/models'
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

const PAGE_SIZE = 10

// Modal de edición: usa ExpenseForm reutilizando la lógica de EditExpensePage.
// Es su propio componente para poder llamar useUpdateExpense(expense.id) por-id.
function EditExpenseModal({
  expense,
  onClose,
}: {
  expense: Expense
  onClose: () => void
}): React.ReactElement {
  const { mutateAsync: updateExpense } = useUpdateExpense(expense.id)
  const { mutateAsync: updateGroup } = useUpdateInstallmentGroup()
  const isSeries = Boolean(expense.installmentGroupId)
  const [scope, setScope] = useState<InstallmentScope>('all')

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    const payload: UpdateExpensePayload = {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      cardId: values.cardId,
      categoryIds: values.categoryIds,
      placeId: values.placeId || undefined,
      date: values.date,
    }
    if (isSeries && scope === 'all') {
      await updateGroup({ groupId: expense.installmentGroupId!, payload })
    } else {
      await updateExpense(payload)
    }
    if (values.receiptFile) {
      await expensesService.uploadReceipt(expense.id, values.receiptFile)
    }
    onClose()
  }

  const initialValues: Partial<ExpenseFormValues> = {
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    cardId: expense.cardId,
    categoryIds: expense.categoryIds,
    placeId: expense.placeId ?? '',
    date: expense.date,
  }

  return (
    <Modal title="Editar gasto" onClose={onClose} width={620}>
      <div className={styles.editModalBody}>
        {isSeries && (
          <InstallmentScopeChoice
            scope={scope}
            onChange={setScope}
            count={expense.installmentCount ?? 0}
            number={expense.installmentNumber}
            action="edit"
          />
        )}
        <ExpenseForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
          variant="desktop"
          onCancel={onClose}
          allowInstallments={false}
        />
      </div>
    </Modal>
  )
}

// Modal de confirmación de eliminación.
function DeleteExpenseModal({
  expense,
  onClose,
}: {
  expense: Expense
  onClose: () => void
}): React.ReactElement {
  const { mutateAsync: deleteExpense, isPending } = useDeleteExpense()
  const { mutateAsync: deleteGroup, isPending: isDeletingGroup } = useDeleteInstallmentGroup()
  const isSeries = Boolean(expense.installmentGroupId)
  const [scope, setScope] = useState<InstallmentScope>('one')

  async function handleDelete(): Promise<void> {
    if (isSeries && scope === 'all') {
      await deleteGroup(expense.installmentGroupId!)
    } else {
      await deleteExpense(expense.id)
    }
    onClose()
  }

  return (
    <Modal title="Eliminar gasto" onClose={onClose} width={420}>
      <p className={styles.deleteText}>
        ¿Seguro que querés eliminar <strong>{expense.description}</strong>? Esta acción no se puede
        deshacer.
      </p>
      {isSeries && (
        <InstallmentScopeChoice
          scope={scope}
          onChange={setScope}
          count={expense.installmentCount ?? 0}
          number={expense.installmentNumber}
          action="delete"
        />
      )}
      <div className={styles.deleteActions}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending || isDeletingGroup}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={isPending || isDeletingGroup}
          onClick={() => void handleDelete()}
        >
          {isSeries && scope === 'all' ? 'Eliminar serie' : 'Eliminar'}
        </Button>
      </div>
    </Modal>
  )
}

export default function ExpensesPage(): React.ReactElement {
  const navigate = useNavigate()
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [search, setSearch] = useState('')
  const [filterCurrency, setFilterCurrency] = useState<Currency | ''>('')
  const [filterCardId] = useState('')
  const [filterPlaceId] = useState('')
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>(GroupBy.Day)
  const [tablePage, setTablePage] = useState(0)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

  const { data: page, isLoading } = useExpenses({ period })
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()
  const { data: allReceipts = [] } = usePendingReceipts()
  const pendingReceipts = useMemo(
    () => allReceipts.filter((r) => r.status === ReceiptStatus.Pending),
    [allReceipts],
  )
  const deleteReceipt = useDeletePendingReceipt()

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

  // Volver a la primera página al cambiar filtros/agrupación
  React.useEffect(() => {
    setTablePage(0)
  }, [search, period, filterCurrency, filterCategoryIds, groupBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(tablePage, totalPages - 1)
  const pagedFiltered = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage],
  )
  const pagedGroups = useMemo(() => {
    switch (groupBy) {
      case GroupBy.Week:
        return groupExpensesByWeek(pagedFiltered)
      case GroupBy.Place:
        return groupExpensesByPlace(pagedFiltered, places)
      case GroupBy.Category:
        return groupExpensesByCategory(pagedFiltered, categories)
      default:
        return groupExpensesByDate(pagedFiltered)
    }
  }, [pagedFiltered, groupBy, places, categories])

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
              {formatAmountNoSymbol(totalUsd, Currency.USD)}
            </p>
          </div>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>Total UYU</p>
            <p className={styles.desktopStatValue}>
              <span className={styles.desktopAmtSymbol}>$ </span>
              {formatAmountNoSymbol(totalUyu, Currency.UYU)}
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

        {/* Pending receipts */}
        {pendingReceipts.length > 0 && (
          <div className={styles.pendingSection}>
            <div className={styles.pendingSectionHeader}>
              <span className={styles.pendingSectionTitle}>
                📷 Comprobantes pendientes ({pendingReceipts.length})
              </span>
              <span className={styles.pendingSectionHint}>Completá los datos para registrarlos como gastos</span>
            </div>
            <div className={styles.pendingList}>
              {pendingReceipts.map((r) => {
                const date = new Date(r.createdAt).toLocaleDateString('es-UY', {
                  day: 'numeric',
                  month: 'short',
                })
                return (
                  <div key={r.id} className={styles.pendingItem}>
                    <button
                      type="button"
                      className={styles.pendingDelete}
                      aria-label="Eliminar comprobante"
                      disabled={deleteReceipt.isPending}
                      onClick={() => {
                        if (window.confirm('¿Eliminar este comprobante?')) {
                          deleteReceipt.mutate(r.id)
                        }
                      }}
                    >
                      🗑️
                    </button>
                    <button
                      type="button"
                      className={styles.pendingItemMain}
                      onClick={() => void navigate(`/receipts/${r.id}/complete`)}
                    >
                      <img
                        src={r.imageUrl}
                        alt="Comprobante"
                        className={styles.pendingThumb}
                      />
                      <div className={styles.pendingInfo}>
                        <span className={styles.pendingItemTitle}>
                          {r.extractedData?.description ?? 'Comprobante sin procesar'}
                        </span>
                        <span className={styles.pendingItemDate}>{date}</span>
                      </div>
                      <span className={styles.pendingComplete}>Completar →</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
                <th className={styles.desktopThActions}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.desktopEmpty}>
                    No hay gastos en este período.
                  </td>
                </tr>
              ) : (
                pagedGroups.map((group) => {
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
                        <td colSpan={2} className={styles.desktopGroupTotal}>
                          {gUsd > 0 && (
                            <span className={styles.groupTotalItem}>
                              <span className={styles.groupTotalAmt}>
                                U$S {formatAmountNoSymbol(gUsd, Currency.USD)}
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
                                $ {formatAmountNoSymbol(gUyu, Currency.UYU)}
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
                        const menuItems: KebabMenuItem[] = [
                          { label: 'Editar', icon: '✏️', onClick: () => setEditingExpense(expense) },
                          {
                            label: 'Eliminar',
                            icon: '🗑️',
                            danger: true,
                            onClick: () => setDeletingExpense(expense),
                          },
                        ]
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
                              {expense.installmentCount && expense.installmentCount > 1 && (
                                <span className={styles.installmentBadge}>
                                  💳 {expense.installmentNumber}/{expense.installmentCount}
                                </span>
                              )}
                              <ReportOriginBadge expense={expense} className={styles.reportBadgeInline} />
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
                            <td
                              className={styles.desktopTdActions}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <KebabMenu items={menuItems} ariaLabel="Acciones del gasto" />
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
          {totalPages > 1 && (
            <div className={styles.desktopPagination}>
              <button
                className={styles.desktopPageBtn}
                disabled={currentPage === 0}
                onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </button>
              <span className={styles.desktopPageInfo}>
                {currentPage + 1} / {totalPages}
              </span>
              <button
                className={styles.desktopPageBtn}
                disabled={currentPage >= totalPages - 1}
                onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {editingExpense && (
          <EditExpenseModal
            expense={editingExpense}
            onClose={() => setEditingExpense(null)}
          />
        )}
        {deletingExpense && (
          <DeleteExpenseModal
            expense={deletingExpense}
            onClose={() => setDeletingExpense(null)}
          />
        )}
      </div>
    )
}
