// src/features/expenses/components/ExpenseListItem.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Expense, Category } from '@/types/models'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './ExpenseListItem.module.css'

interface ExpenseListItemProps {
  expense: Expense
  categories: Category[]
}

export function ExpenseListItem({
  expense,
  categories,
}: ExpenseListItemProps): React.ReactElement {
  const navigate = useNavigate()
  const expenseCategories = categories.filter((c) => expense.categoryIds.includes(c.id))
  const firstCat = expenseCategories[0]

  return (
    <article
      className={styles.row}
      onClick={() => navigate(`/expenses/${expense.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/expenses/${expense.id}`)}
      aria-label={`${expense.description}, ${formatCurrency(expense.amount, expense.currency)}`}
    >
      <div className={styles.icon} aria-hidden>
        {firstCat?.icon ?? '💸'}
      </div>

      <div className={styles.info}>
        <p className={styles.name}>{expense.description}</p>
        <div className={styles.meta}>
          {expenseCategories.map((cat) => (
            <span key={cat.id} className={styles.catBadge}>
              {cat.name}
            </span>
          ))}
          {expense.placeId && (
            <span className={styles.place}>📍</span>
          )}
        </div>
      </div>

      <div className={styles.amount}>
        <p className={styles.value}>
          −{formatCurrency(expense.amount, expense.currency)}
        </p>
        <p className={styles.currency}>{expense.currency}</p>
      </div>
    </article>
  )
}
