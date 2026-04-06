// src/pages/CategoryPickerPage.tsx

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import styles from './CategoryPickerPage.module.css'

interface LocationState {
  currentSelected?: string[]
  formValues?: ExpenseFormValues
  returnTo?: string
}

export default function CategoryPickerPage(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const returnTo = state.returnTo ?? '/expenses/new'

  const { data: categories = [], isLoading } = useCategories()

  const [selected, setSelected] = useState<string[]>(state.currentSelected ?? [])
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : categories

  function toggle(id: string): void {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function confirm(): void {
    void navigate(returnTo, {
      state: { pickedCategoryIds: selected, savedFormValues: state.formValues },
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => void navigate(-1)}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className={styles.title}>Categorías</h1>
        <button className={styles.confirmBtn} onClick={confirm}>
          Listo {selected.length > 0 && `(${selected.length})`}
        </button>
      </header>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden>🔍</span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No hay categorías que coincidan.</p>
          ) : (
            filtered.map((cat) => {
              const isSelected = selected.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  className={[styles.row, isSelected ? styles.rowSelected : ''].join(' ')}
                  onClick={() => toggle(cat.id)}
                >
                  <span className={styles.rowIcon}>{cat.icon}</span>
                  <span className={styles.rowName}>{cat.name}</span>
                  <span className={[styles.check, isSelected ? styles.checkVisible : ''].join(' ')}>
                    ✓
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
