// src/pages/NewExpensePage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useCreateExpense } from '@/features/expenses/hooks/useExpenses'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { CreateExpensePayload } from '@/types/models'
import styles from './NewExpensePage.module.css'

export default function NewExpensePage(): React.ReactElement {
  const navigate = useNavigate()
  const { mutateAsync: createExpense } = useCreateExpense()

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    const payload: CreateExpensePayload = {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      cardId: values.cardId,
      categoryIds: values.categoryIds,
      placeId: values.placeId || undefined,
      date: values.date,
    }
    await createExpense(payload)
    navigate('/expenses')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.closeBtn}
          onClick={() => navigate(-1)}
          aria-label="Cerrar"
        >
          ←
        </button>
        <h1 className={styles.title}>Nuevo gasto</h1>
        <div style={{ width: 36 }} />
      </header>

      <ExpenseForm onSubmit={handleSubmit} submitLabel="Guardar gasto" />
    </div>
  )
}
