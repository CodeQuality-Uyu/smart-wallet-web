// src/features/expenses/components/CategorySuggestionBanner.tsx

import React from 'react'
import type { Category } from '@/types/models'
import type { CategorySuggestionResult, NewCategorySuggestion } from '@/services/geminiService'
import styles from './CategorySuggestionBanner.module.css'

interface Props {
  suggestion: CategorySuggestionResult
  categories: Category[]
  onAcceptMatch: (categoryId: string) => void
  onAcceptNewSuggestion: (suggestion: NewCategorySuggestion) => void
  onDismiss: () => void
}

export function CategorySuggestionBanner({
  suggestion,
  categories,
  onAcceptMatch,
  onAcceptNewSuggestion,
  onDismiss,
}: Props): React.ReactElement | null {
  const matchedCats = (suggestion.matches ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as Category[]

  if (matchedCats.length === 0 && suggestion.suggestions.length === 0) return null

  return (
    <div className={styles.banner}>
      <span className={styles.label}>Sugerencia:</span>
      <div className={styles.newList}>
        {matchedCats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={styles.chip}
            onClick={() => onAcceptMatch(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
        {suggestion.suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            className={styles.newChip}
            style={{ '--chip-color': s.color } as React.CSSProperties}
            onClick={() => onAcceptNewSuggestion(s)}
          >
            {s.icon} {s.name}
            <span className={styles.createHint}>Crear</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Ignorar sugerencia">
        ✕
      </button>
    </div>
  )
}
