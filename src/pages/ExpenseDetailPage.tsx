// src/pages/ExpenseDetailPage.tsx

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExpense, useDeleteExpense, useAddTicketLine, useRemoveTicketLine, useUploadExpenseReceipt } from '@/features/expenses/hooks/useExpenses'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './ExpenseDetailPage.module.css'

export default function ExpenseDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: expense, isLoading, error } = useExpense(id ?? '')
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { mutateAsync: deleteExpense } = useDeleteExpense()
  const { mutateAsync: addLine, isPending: addingLine } = useAddTicketLine(id ?? '')
  const { mutateAsync: removeLine } = useRemoveTicketLine(id ?? '')
  const { mutateAsync: uploadReceipt, isPending: uploadingReceipt } = useUploadExpenseReceipt(id ?? '')

  const [newLineName, setNewLineName] = React.useState('')
  const [newLineAmount, setNewLineAmount] = React.useState('')
  const receiptInputRef = React.useRef<HTMLInputElement>(null)

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !expense) return <ErrorMessage message="No se pudo cargar el gasto." />

  const expenseCategories = categories.filter((c) => expense.categoryIds.includes(c.id))
  const card = cards.find((c) => c.id === expense.cardId)
  const firstIcon = expenseCategories[0]?.icon ?? '💸'
  const ticketTotal = expense.ticketLines.reduce((s, l) => s + l.amount, 0)

  async function handleDelete(): Promise<void> {
    if (!window.confirm('¿Eliminar este gasto?')) return
    await deleteExpense(expense.id)
    navigate('/expenses')
  }

  async function handleAddLine(): Promise<void> {
    if (!newLineName.trim() || !newLineAmount) return
    await addLine({ name: newLineName.trim(), amount: parseFloat(newLineAmount) })
    setNewLineName('')
    setNewLineAmount('')
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
          <input
            className={styles.lineInput}
            placeholder="Nombre del ítem"
            value={newLineName}
            onChange={(e) => setNewLineName(e.target.value)}
            aria-label="Nombre del ítem"
            disabled={addingLine}
          />
          <input
            className={styles.lineInput}
            type="number"
            placeholder="Monto"
            value={newLineAmount}
            onChange={(e) => setNewLineAmount(e.target.value)}
            aria-label="Monto del ítem"
            style={{ width: 90, fontFamily: 'var(--font-num)' }}
            disabled={addingLine}
          />
          <button
            className={styles.addLineBtn}
            onClick={() => void handleAddLine()}
            aria-label="Agregar ítem"
            disabled={addingLine}
          >
            {addingLine ? '⏳' : '✓'}
          </button>
        </div>

        {expense.ticketLines.map((line) => (
          <div key={line.id} className={styles.ticketLine}>
            <span className={styles.lineName}>{line.name}</span>
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
