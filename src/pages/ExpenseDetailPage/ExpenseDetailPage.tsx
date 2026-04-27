// src/pages/ExpenseDetailPage.tsx

import React, { useRef, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useExpenses,
  useExpense,
  useDeleteExpense,
  useAddTicketLine,
  useRemoveTicketLine,
  useUploadExpenseReceipt,
} from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useAddPriceRecord, PRICE_HISTORY_KEYS } from '@/features/products/hooks/usePriceHistory'
import { ProductLineAutocomplete } from '@/features/products/components/ProductLineAutocomplete'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatCurrency'
import { Currency, PeriodFilter, ProductPricingType, WeightUnit } from '@/types/enums'
import type { Product } from '@/types/models'
import type { PriceByPlace } from '@/backend/types'
import styles from './ExpenseDetailPage.module.css'


// ─── Unit price calculation for ByWeight products ───────────

function calcUnitPrice(weightValue: number, weightUnit: WeightUnit, pricePaid: number): number {
  switch (weightUnit) {
    case WeightUnit.Kg:
      return pricePaid / (weightValue / 1000)
    case WeightUnit.G:
      return pricePaid / weightValue
    case WeightUnit.L:
      return pricePaid / (weightValue / 1000)
    case WeightUnit.Ml:
      return pricePaid / weightValue
  }
}

// ─── Main page ──────────────────────────────────────────────

export default function ExpenseDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as {
    period?: PeriodFilter
    filterCurrency?: Currency | ''
    filterCategoryIds?: string[]
  } | null
  const qc = useQueryClient()
  const { data: expensesPage } = useExpenses(
    navState?.period ? { period: navState.period } : undefined
  )
  const { data: expense, isLoading, error } = useExpense(id ?? '')
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()
  const { mutateAsync: deleteExpense } = useDeleteExpense()
  const { mutateAsync: addLine, isPending: addingLine } = useAddTicketLine(id ?? '')
  const { mutateAsync: removeLine } = useRemoveTicketLine(id ?? '')
  const { mutateAsync: uploadReceipt, isPending: uploadingReceipt } = useUploadExpenseReceipt(
    id ?? ''
  )
  const { mutateAsync: addPriceRecord } = useAddPriceRecord()
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const [newLineName, setNewLineName] = useState('')
  const [newLineProduct, setNewLineProduct] = useState<Product | null>(null)
  // Fixed product: amount
  const [newLineAmount, setNewLineAmount] = useState('')
  // ByWeight product: weight input + price paid
  const [newLineWeight, setNewLineWeight] = useState('')
  const [newLinePricePaid, setNewLinePricePaid] = useState('')

  const allExpenses = useMemo(() => {
    let list = expensesPage?.data ?? []
    if (navState?.filterCurrency) list = list.filter((e) => e.currency === navState.filterCurrency)
    if (navState?.filterCategoryIds?.length) {
      list = list.filter((e) =>
        navState.filterCategoryIds!.some((cid) => e.categoryIds.includes(cid))
      )
    }
    return list
  }, [expensesPage?.data, navState?.filterCurrency, navState?.filterCategoryIds])

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !expense) return <ErrorMessage message="No se pudo cargar el gasto." />

  const expenseCategories = categories.filter((c) => expense.categoryIds.includes(c.id))
  const card = cards.find((c) => c.id === expense.cardId)
  const place = places.find((p) => p.id === expense.placeId)
  const firstIcon = expenseCategories[0]?.icon ?? '💸'
  const ticketTotal = expense.ticketLines.reduce((s, l) => s + l.amount, 0)

  const isByWeight = newLineProduct?.pricingType === ProductPricingType.ByWeight
  const weightUnit = newLineProduct?.weightUnit

  // Determine the effective amount for the line
  function getEffectiveAmount(): number {
    if (isByWeight) return parseFloat(newLinePricePaid)
    return parseFloat(newLineAmount)
  }

  function isFormValid(): boolean {
    if (!newLineProduct) return false
    if (isByWeight) {
      const w = parseFloat(newLineWeight)
      const p = parseFloat(newLinePricePaid)
      return !!newLineWeight && !!newLinePricePaid && !isNaN(w) && w > 0 && !isNaN(p) && p > 0
    }
    const a = parseFloat(newLineAmount)
    return !!newLineAmount && !isNaN(a) && a > 0
  }

  async function handleAddLine(): Promise<void> {
    if (!newLineProduct || !isFormValid()) return

    const amount = getEffectiveAmount()

    // Calculate unit price for price history comparison
    let unitPrice = amount
    if (isByWeight && weightUnit) {
      const weightValue = parseFloat(newLineWeight)
      unitPrice = calcUnitPrice(weightValue, weightUnit, amount)
    }

    await addLine({
      name: newLineName,
      amount,
      productId: newLineProduct.id,
    })

    // Compare with last price for this place and record if changed
    if (newLineProduct.globalProductId && expense!.placeId) {
      try {
        const cached = qc.getQueryData<PriceByPlace[]>(
          PRICE_HISTORY_KEYS.byPlace(newLineProduct.globalProductId)
        )
        const existingEntry = cached?.find((r) => r.placeId === expense!.placeId)
        const shouldRecord = !existingEntry || existingEntry.unitPrice !== unitPrice

        if (shouldRecord) {
          await addPriceRecord({
            productId: newLineProduct.globalProductId,
            placeId: expense!.placeId,
            unitPrice,
            currency: expense!.currency as Currency,
            recordedAt: expense!.date,
          })
        }
      } catch {
        // Price record is secondary — don't block the line add
      }
    }

    setNewLineName('')
    setNewLineProduct(null)
    setNewLineAmount('')
    setNewLineWeight('')
    setNewLinePricePaid('')
  }

  async function handleDelete(): Promise<void> {
    if (!expense || !window.confirm('¿Eliminar este gasto?')) return
    await deleteExpense(expense.id)
    navigate('/expenses')
  }

  return (
    <div className={styles.layout}>
      {/* Sidenav */}
      <div className={styles.sidenav}>
        <p className={styles.sidenavTitle}>Gastos</p>
        <div className={styles.sidenavList}>
          {allExpenses.map((e) => {
            const cat = categories.find((c) => e.categoryIds.includes(c.id))
            const isActive = e.id === id
            return (
              <button
                key={e.id}
                className={[styles.sidenavItem, isActive ? styles.sidenavItemActive : ''].join(' ')}
                onClick={() => navigate(`/expenses/${e.id}`, { state: navState })}
              >
                <span className={styles.sidenavIcon}>{cat?.icon ?? '💸'}</span>
                <div className={styles.sidenavInfo}>
                  <span className={styles.sidenavDesc}>{e.description}</span>
                  <span className={styles.sidenavAmt}>{formatCurrency(e.amount, e.currency)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div className={styles.page}>
        {/* Header card */}
        <header className={styles.header}>
          <div className={styles.headerBody}>
            <div className={styles.headerLeft}>
              <div className={styles.icon} aria-hidden>
                {firstIcon}
              </div>
              <div className={styles.headerInfo}>
                <h1 className={styles.name}>{expense.description}</h1>
                <div className={styles.amountRow}>
                  <span className={styles.amount}>
                    {formatCurrency(expense.amount, expense.currency as Currency)}
                  </span>
                </div>
                {card && (
                  <span className={styles.paymentBadge}>
                    {card.lastFour ? `${card.bank} ···· ${card.lastFour}` : card.name}
                  </span>
                )}
              </div>
            </div>
            <button
              className={styles.edit}
              onClick={() => navigate(`/expenses/${id}/edit`)}
              aria-label="Editar"
            >
              ✏️
            </button>
          </div>
        </header>

        {/* Detail rows */}
        <div className={styles.body}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Fecha</span>
            <span className={styles.rowValue}>
              {new Date(`${expense.date}T12:00:00`).toLocaleDateString('es-UY', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Local</span>
            <span className={styles.rowValue}>
              {place ? `${place.icon ?? ''} ${place.name}`.trim() : '—'}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Categorías</span>
            <div className={styles.cats}>
              {expenseCategories.length > 0 ? (
                expenseCategories.map((cat) => (
                  <span key={cat.id} className={styles.catPill}>
                    {cat.icon} {cat.name}
                  </span>
                ))
              ) : (
                <span className={styles.rowValue}>—</span>
              )}
            </div>
          </div>
          {expense.ticketLines.length > 0 && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Total ítems</span>
              <span className={styles.rowValue} style={{ color: 'var(--g700)', fontWeight: 700 }}>
                {formatCurrency(ticketTotal, expense.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Receipt */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Comprobante</h2>
          </div>
          <div className={styles.receiptBody}>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadReceipt(file)
              }}
            />
            {expense.receiptUrl ? (
              <div className={styles.receiptPreview}>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.receiptLink}
                >
                  📄 Ver comprobante
                </a>
                <button
                  className={styles.receiptChange}
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={uploadingReceipt}
                >
                  {uploadingReceipt ? 'Subiendo...' : 'Cambiar'}
                </button>
              </div>
            ) : (
              <div
                className={styles.uploadArea}
                onClick={() => receiptInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && receiptInputRef.current?.click()}
              >
                {uploadingReceipt ? '⏳ Subiendo...' : '📄 Subir comprobante'}
              </div>
            )}
          </div>
        </div>

        {/* Ticket lines */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Líneas del ticket</h2>
          </div>

          <div className={styles.addLineForm}>
            <div className={styles.addLineRow}>
              <ProductLineAutocomplete
                value={newLineName}
                onChange={(name, product) => {
                  setNewLineName(name)
                  setNewLineProduct(product)
                  // Pre-fill amount from last known price for this place
                  if (product?.globalProductId && expense?.placeId) {
                    const cached = qc.getQueryData<PriceByPlace[]>(
                      PRICE_HISTORY_KEYS.byPlace(product.globalProductId)
                    )
                    const entry = cached?.find((r) => r.placeId === expense.placeId)
                    if (entry) {
                      const isByWeightProduct =
                        product.pricingType === ProductPricingType.ByWeight
                      if (isByWeightProduct) {
                        setNewLinePricePaid(String(entry.unitPrice))
                        setNewLineAmount('')
                      } else {
                        setNewLineAmount(String(entry.unitPrice))
                        setNewLinePricePaid('')
                      }
                      setNewLineWeight('')
                    } else {
                      setNewLineAmount('')
                      setNewLineWeight('')
                      setNewLinePricePaid('')
                    }
                  } else {
                    setNewLineAmount('')
                    setNewLineWeight('')
                    setNewLinePricePaid('')
                  }
                }}
                disabled={addingLine}
              />
              {isByWeight ? (
                <>
                  <input
                    className={styles.lineInput}
                    style={{ width: 80, flexShrink: 0, fontFamily: 'var(--font-num)' }}
                    type="number"
                    placeholder={weightUnit ?? 'Peso'}
                    value={newLineWeight}
                    onChange={(e) => setNewLineWeight(e.target.value)}
                    aria-label="Peso"
                    disabled={addingLine}
                  />
                  <input
                    className={styles.lineInput}
                    style={{ width: 90, flexShrink: 0, fontFamily: 'var(--font-num)' }}
                    type="number"
                    placeholder="Precio"
                    value={newLinePricePaid}
                    onChange={(e) => setNewLinePricePaid(e.target.value)}
                    aria-label="Precio pagado"
                    disabled={addingLine}
                  />
                </>
              ) : (
                <input
                  className={styles.lineInput}
                  style={{ width: 100, flexShrink: 0, fontFamily: 'var(--font-num)' }}
                  type="number"
                  placeholder="Monto"
                  value={newLineAmount}
                  onChange={(e) => setNewLineAmount(e.target.value)}
                  aria-label="Monto del ítem"
                  disabled={addingLine}
                />
              )}
              <button
                className={styles.addLineBtn}
                onClick={() => void handleAddLine()}
                aria-label="Agregar ítem"
                disabled={addingLine || !isFormValid()}
              >
                {addingLine ? '⏳' : '✓'}
              </button>
            </div>

            <p className={styles.lineHint}>
              ¿No encontrás el producto?{' '}
              <button
                className={styles.lineHintLink}
                onClick={() => navigate('/settings/products/new')}
              >
                Crear nuevo
              </button>
            </p>

            {isByWeight &&
              weightUnit &&
              newLineWeight &&
              newLinePricePaid &&
              (() => {
                const w = parseFloat(newLineWeight)
                const p = parseFloat(newLinePricePaid)
                if (!isNaN(w) && w > 0 && !isNaN(p) && p > 0) {
                  const up = calcUnitPrice(w, weightUnit, p)
                  return (
                    <span className={styles.lineHint}>
                      Precio unitario: {formatCurrency(up, expense.currency)}/{weightUnit}
                    </span>
                  )
                }
                return null
              })()}
          </div>

          {expense.ticketLines.map((line) => (
            <div key={line.id} className={styles.ticketLine}>
              <div className={styles.lineLeft}>
                <span className={styles.lineName}>{line.name}</span>
                {line.productId && (
                  <span className={styles.linkedBadge} title="Vinculado al catálogo">
                    📦
                  </span>
                )}
              </div>
              <div className={styles.lineRight}>
                <span className={styles.lineAmt}>
                  {formatCurrency(line.amount, expense.currency)}
                </span>
                <button
                  className={styles.lineDelete}
                  onClick={() => void removeLine(line.id)}
                  aria-label={`Eliminar ${line.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delete */}
        <div className={styles.deleteArea}>
          <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
            Eliminar gasto
          </Button>
        </div>
      </div>
      {/* end .page */}
    </div>
  )
}
