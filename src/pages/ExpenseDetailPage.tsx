// src/pages/ExpenseDetailPage.tsx

import React, { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useExpense, useDeleteExpense, useAddTicketLine, useRemoveTicketLine, useUploadExpenseReceipt } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useAddPriceRecord, PRICE_HISTORY_KEYS } from '@/features/products/hooks/usePriceHistory'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatCurrency'
import { Currency, ProductPricingType, WeightUnit } from '@/types/enums'
import type { Product } from '@/types/models'
import type { PriceByPlace } from '@/backend/types'
import styles from './ExpenseDetailPage.module.css'

// ─── Product autocomplete ────────────────────────────────────

interface LineProductInputProps {
  value: string
  onChange: (name: string, product: Product | null) => void
  disabled?: boolean
}

function LineProductInput({ value, onChange, disabled }: LineProductInputProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { data: products = [] } = useProducts()

  const query = value.toLowerCase()
  const suggestions = query.length >= 1
    ? products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6)
    : []

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={wrapRef} className={styles.lineProductWrap}>
      <input
        className={styles.lineInput}
        placeholder="Buscar producto..."
        value={value}
        onChange={(e) => { onChange(e.target.value, null); setOpen(true) }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className={styles.lineDropdown} role="listbox">
          {suggestions.map((p) => (
            <li
              key={p.id}
              role="option"
              className={styles.lineDropdownItem}
              onMouseDown={() => { onChange(p.name, p); setOpen(false) }}
            >
              <span className={styles.lineDropdownName}>{p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Unit price calculation for ByWeight products ───────────

function calcUnitPrice(weightValue: number, weightUnit: WeightUnit, pricePaid: number): number {
  switch (weightUnit) {
    case WeightUnit.Kg: return pricePaid / (weightValue / 1000)
    case WeightUnit.G:  return pricePaid / weightValue
    case WeightUnit.L:  return pricePaid / (weightValue / 1000)
    case WeightUnit.Ml: return pricePaid / weightValue
  }
}

// ─── Main page ──────────────────────────────────────────────

export default function ExpenseDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: expense, isLoading, error } = useExpense(id ?? '')
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()
  const { mutateAsync: deleteExpense } = useDeleteExpense()
  const { mutateAsync: addLine, isPending: addingLine } = useAddTicketLine(id ?? '')
  const { mutateAsync: removeLine } = useRemoveTicketLine(id ?? '')
  const { mutateAsync: uploadReceipt, isPending: uploadingReceipt } = useUploadExpenseReceipt(id ?? '')
  const { mutateAsync: addPriceRecord } = useAddPriceRecord()
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const [newLineName, setNewLineName] = useState('')
  const [newLineProduct, setNewLineProduct] = useState<Product | null>(null)
  // Fixed product: amount
  const [newLineAmount, setNewLineAmount] = useState('')
  // ByWeight product: weight input + price paid
  const [newLineWeight, setNewLineWeight] = useState('')
  const [newLinePricePaid, setNewLinePricePaid] = useState('')

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
  }[]

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
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <button className={styles.edit} onClick={() => navigate(`/expenses/${id}/edit`)}>✏️ Editar</button>
        </div>
        <div className={styles.icon} aria-hidden>{firstIcon}</div>
        <h1 className={styles.name}>{expense.description}</h1>
        <div className={styles.amountRow}>
          <span className={styles.amount}>{expense.amount}</span>
          <span className={styles.currency}>{expense.currency}</span>
        </div>
        {card && (
          <span className={styles.paymentBadge}>
            {card.lastFour ? `${card.bank} ···· ${card.lastFour}` : card.name}
          </span>
        )}
      </header>

      {/* Detail rows */}
      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📅 Fecha</span>
          <span className={styles.rowValue}>{expense.date}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📍 Local</span>
          <span className={styles.rowValue}>{place?.icon ?? ''} {place?.name ?? '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>🏷 Categorías</span>
          <div className={styles.cats}>
            {expenseCategories.map((cat) => (
              <span key={cat.id} className={styles.catPill}>{cat.icon} {cat.name}</span>
            ))}
          </div>
        </div>

        {expense.ticketLines.length > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>🧮 Total ítems</span>
            <span className={styles.rowValue} style={{ color: 'var(--g600)', fontWeight: 700 }}>
              {formatCurrency(ticketTotal, expense.currency)}
            </span>
          </div>
        )}
      </div>

      {/* Receipt */}
      <section className={styles.receiptSection}>
        <h2 className={styles.ticketTitle}>🧾 Comprobante</h2>
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
            <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className={styles.receiptLink}>
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
      </section>

      {/* Ticket lines */}
      <section className={styles.ticketSection}>
        <div className={styles.ticketHeader}>
          <h2 className={styles.ticketTitle}>📝 Líneas del ticket</h2>
        </div>

        {/* Add line form */}
        <div className={styles.addLineForm}>
          {/* Row 1: product autocomplete + amount (or weight + price paid) */}
          <div className={styles.addLineRow}>
            <LineProductInput
              value={newLineName}
              onChange={(name, product) => {
                setNewLineName(name)
                setNewLineProduct(product)
                // Reset amount fields when product changes
                setNewLineAmount('')
                setNewLineWeight('')
                setNewLinePricePaid('')
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

          {/* Create product link */}
          <p className={styles.lineHint}>
            ¿No encontrás el producto?{' '}
            <button className={styles.lineHintLink} onClick={() => navigate('/settings/products/new')}>
              Crear nuevo
            </button>
          </p>

          {/* ByWeight unit price preview */}
          {isByWeight && weightUnit && newLineWeight && newLinePricePaid && (
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
            })()
          )}
        </div>

        {expense.ticketLines.map((line) => (
          <div key={line.id} className={styles.ticketLine}>
            <div className={styles.lineLeft}>
              <span className={styles.lineName}>{line.name}</span>
              {line.productId && (
                <span className={styles.linkedBadge} title="Vinculado al catálogo">📦</span>
              )}
            </div>
            <div className={styles.lineRight}>
              <span className={styles.lineAmt}>{formatCurrency(line.amount, expense.currency)}</span>
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
      </section>

      {/* Delete */}
      <div style={{ padding: '0 20px 32px' }}>
        <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
          Eliminar gasto
        </Button>
      </div>
    </div>
  )
}
