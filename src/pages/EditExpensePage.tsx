// src/pages/EditExpensePage.tsx

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useExpense, useUpdateExpense } from '@/features/expenses/hooks/useExpenses'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import styles from './NewExpensePage.module.css' // reuse same header styles

export default function EditExpensePage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: expense, isLoading, error } = useExpense(id ?? '')
  const { mutateAsync: updateExpense } = useUpdateExpense(id ?? '')

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    await updateExpense(values)
    navigate(`/expenses/${id}`)
  }

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !expense) return <ErrorMessage message="No se pudo cargar el gasto." />

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
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.closeBtn} onClick={() => navigate(-1)} aria-label="Cancelar">
          ←
        </button>
        <h1 className={styles.title}>Editar gasto</h1>
        <div style={{ width: 36 }} />
      </header>

      <ExpenseForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
