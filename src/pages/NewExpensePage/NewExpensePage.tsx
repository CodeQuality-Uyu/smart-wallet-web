// src/pages/NewExpensePage.tsx

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useCreateExpense } from '@/features/expenses/hooks/useExpenses'
import { expensesService } from '@/services/expensesService'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { ReceiptUploader } from '@/features/pendingReceipts/components/ReceiptUploader'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { CreateExpensePayload } from '@/types/models'
import styles from './NewExpensePage.module.css'

type Tab = 'manual' | 'receipt'

interface LocationState {
  pickedCategoryIds?: string[]
  savedFormValues?: ExpenseFormValues
}

export default function NewExpensePage(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as LocationState
  const { mutateAsync: createExpense } = useCreateExpense()
  const { data: userPrefs } = useUserPrefs()
  const defaultCardId = userPrefs?.defaultCardId
  const [activeTab, setActiveTab] = useState<Tab>('manual')

  // Restore form values when returning from CategoryPickerPage
  const restoredValues = locationState.savedFormValues
    ? {
        ...locationState.savedFormValues,
        ...(locationState.pickedCategoryIds !== undefined && { categoryIds: locationState.pickedCategoryIds }),
      }
    : {
        ...(locationState.pickedCategoryIds !== undefined && { categoryIds: locationState.pickedCategoryIds }),
        ...(defaultCardId && { cardId: defaultCardId }),
      }

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
    const expense = await createExpense(payload)
    if (values.receiptFile) {
      await expensesService.uploadReceipt(expense.id, values.receiptFile)
    }
    navigate('/expenses')
  }

  return (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        <div className={styles.desktopHeader}>
          <h1 className={styles.desktopTitle}>Nuevo gasto</h1>
        </div>

        <div className={styles.tabs}>
          <button
            className={[styles.tab, activeTab === 'manual' ? styles.tabActive : ''].join(' ')}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ Registrar gasto
          </button>
          <button
            className={[styles.tab, activeTab === 'receipt' ? styles.tabActive : ''].join(' ')}
            onClick={() => setActiveTab('receipt')}
          >
            📷 Subir comprobante
          </button>
        </div>

        {activeTab === 'manual' ? (
          <ExpenseForm
            initialValues={restoredValues}
            onSubmit={handleSubmit}
            submitLabel="Guardar gasto"
            variant="desktop"
            onCancel={() => navigate(-1)}
          />
        ) : (
          <ReceiptUploader />
        )}
      </div>
    </div>
  )
}
