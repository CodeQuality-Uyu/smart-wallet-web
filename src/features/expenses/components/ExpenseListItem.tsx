// src/features/expenses/components/ExpenseListItem.tsx

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Expense, Category } from '@/types/models'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './ExpenseListItem.module.css'

interface ExpenseListItemProps {
  expense: Expense
  categories: Category[]
  onDuplicate?: (id: string) => void
}

export function ExpenseListItem({
  expense,
  categories,
  onDuplicate,
}: ExpenseListItemProps): React.ReactElement {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const expenseCategories = categories.filter((c) => expense.categoryIds.includes(c.id))
  const firstCat = expenseCategories[0]

  const hasActions = Boolean(onDuplicate)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleRowClick(e: React.MouseEvent): void {
    if ((e.target as HTMLElement).closest('[data-menu]')) return
    navigate(`/expenses/${expense.id}`)
  }

  return (
    <article
      className={styles.row}
      onClick={handleRowClick}
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
          {expense.placeId && <span className={styles.place}>📍</span>}
        </div>
      </div>

      <div className={styles.amount}>
        <p className={styles.value}>
          {expense.currency === 'USD' ? 'U$S' : '$'} {formatCurrency(expense.amount, expense.currency).replace(/^[^\d]*/, '')}
        </p>
        <p className={styles.currencyBadge}>{expense.currency}</p>
      </div>

      {hasActions && (
        <div className={styles.menuWrap} data-menu="" ref={menuRef}>
          <button
            className={styles.menuTrigger}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            aria-label="Acciones"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown} role="menu">
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  navigate(`/expenses/${expense.id}`)
                }}
              >
                ✏️ Editar
              </button>
              {onDuplicate && (
                <button
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDuplicate(expense.id)
                  }}
                >
                  📋 Duplicar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
