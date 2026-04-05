// src/features/expenses/components/CategoryChips.tsx

import React from 'react'
import type { Category } from '@/types/models'
import styles from './CategoryChips.module.css'

interface CategoryChipsProps {
  categories: Category[]
  selected: string[]
  onChange: (ids: string[]) => void
  maxVisible?: number
}

export function CategoryChips({
  categories,
  selected,
  onChange,
  maxVisible,
}: CategoryChipsProps): React.ReactElement {
  function toggle(id: string): void {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const base = maxVisible ? categories.slice(0, maxVisible) : categories
  const baseIds = new Set(base.map((c) => c.id))
  const extraSelected = categories.filter((c) => selected.includes(c.id) && !baseIds.has(c.id))

  let visible: typeof categories
  if (!maxVisible || extraSelected.length === 0) {
    visible = base
  } else {
    const slots = maxVisible - extraSelected.length
    const prioritizedBase = [
      ...base.filter((c) => selected.includes(c.id)),
      ...base.filter((c) => !selected.includes(c.id)),
    ].slice(0, slots)
    visible = [...extraSelected, ...prioritizedBase]
  }

  return (
    <div className={styles.scroll} role="group" aria-label="Categorías">
      {visible.map((cat) => {
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
