// src/features/expenses/components/CategoryChips.tsx

import React from 'react'
import type { Category } from '@/types/models'
import styles from './CategoryChips.module.css'

interface CategoryChipsProps {
  categories: Category[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function CategoryChips({
  categories,
  selected,
  onChange,
}: CategoryChipsProps): React.ReactElement {
  function toggle(id: string): void {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className={styles.scroll} role="group" aria-label="Categorías">
      {categories.map((cat) => {
        const isSelected = selected.includes(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            className={[styles.chip, isSelected ? styles.chipSelected : ''].join(' ')}
            onClick={() => toggle(cat.id)}
          >
            <span aria-hidden>{cat.icon}</span>
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
