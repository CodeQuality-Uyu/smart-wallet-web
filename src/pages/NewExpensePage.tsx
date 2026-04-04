// src/pages/NewExpensePage.tsx

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useCreateExpense } from '@/features/expenses/hooks/useExpenses'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { CreateExpensePayload } from '@/types/models'
import styles from './NewExpensePage.module.css'

interface LocationState {
  pickedCategoryIds?: string[]
  savedFormValues?: ExpenseFormValues
}

export default function NewExpensePage(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as LocationState
  const { mutateAsync: createExpense } = useCreateExpense()

  // Restore form values when returning from CategoryPickerPage
  const restoredValues = locationState.savedFormValues
    ? {
        ...locationState.savedFormValues,
        ...(locationState.pickedCategoryIds !== undefined && { categoryIds: locationState.pickedCategoryIds }),
      }
    : locationState.pickedCategoryIds !== undefined
      ? { categoryIds: locationState.pickedCategoryIds }
      : undefined

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
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        <div className={styles.desktopHeader}>
          <h1 className={styles.desktopTitle}>Nuevo gasto</h1>
        </div>
        <ExpenseForm
          initialValues={restoredValues}
          onSubmit={handleSubmit}
          submitLabel="Guardar gasto"
          variant="desktop"
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
