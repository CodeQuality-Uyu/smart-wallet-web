// src/pages/EditExpensePage.tsx

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import {
  useExpense,
  useUpdateExpense,
  useUpdateInstallmentGroup,
} from '@/features/expenses/hooks/useExpenses'
import {
  InstallmentScopeChoice,
  type InstallmentScope,
} from '@/features/expenses/components/InstallmentScopeChoice'
import { expensesService } from '@/services/expensesService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { UpdateExpensePayload } from '@/types/models'
import styles from '../NewExpensePage/NewExpensePage.module.css'

export default function EditExpensePage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: expense, isLoading, error } = useExpense(id ?? '')
  const { mutateAsync: updateExpense } = useUpdateExpense(id ?? '')
  const { mutateAsync: updateGroup } = useUpdateInstallmentGroup()
  const [scope, setScope] = useState<InstallmentScope>('all')

  const isSeries = Boolean(expense?.installmentGroupId)

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
    if (isSeries && scope === 'all' && expense?.installmentGroupId) {
      await updateGroup({ groupId: expense.installmentGroupId, payload })
    } else {
      await updateExpense(payload)
    }
    if (values.receiptFile && id) {
      await expensesService.uploadReceipt(id, values.receiptFile)
    }
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
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        <div className={styles.desktopHeader}>
          <h1 className={styles.desktopTitle}>Editar gasto</h1>
        </div>
        {isSeries && (
          <div style={{ padding: '0 24px' }}>
            <InstallmentScopeChoice
              scope={scope}
              onChange={setScope}
              count={expense?.installmentCount ?? 0}
              number={expense?.installmentNumber}
              action="edit"
            />
          </div>
        )}
        <ExpenseForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
          variant="desktop"
          onCancel={() => navigate(-1)}
          allowInstallments={false}
        />
      </div>
    </div>
  )
}
