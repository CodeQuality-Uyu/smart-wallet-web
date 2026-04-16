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
  if (!suggestion.match && suggestion.suggestions.length === 0) return null

  if (suggestion.match) {
    const cat = categories.find((c) => c.id === suggestion.match)
    if (!cat) return null
    return (
      <div className={styles.banner}>
        <span className={styles.label}>Sugerencia:</span>
        <button
          type="button"
          className={styles.chip}
          onClick={() => onAcceptMatch(cat.id)}
        >
          {cat.icon} {cat.name}
        </button>
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Ignorar sugerencia">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className={styles.bannerNew}>
      <span className={styles.label}>Categorías sugeridas:</span>
      <div className={styles.newList}>
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
