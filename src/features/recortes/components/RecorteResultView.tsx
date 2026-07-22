// src/features/recortes/components/RecorteResultView.tsx
// Renderiza un RecorteResult según su formato de salida.

import React from 'react'
import { formatCurrency } from '@/utils/formatCurrency'
import { Currency, RecorteOutputFormat, RecorteBadgeLevel } from '@/types/enums'
import type { RecorteResult } from '@/types/models'
import styles from './RecorteCard.module.css'

const BADGE_CLASS: Record<RecorteBadgeLevel, string> = {
  [RecorteBadgeLevel.Good]: styles.badgeGood,
  [RecorteBadgeLevel.Warning]: styles.badgeWarning,
  [RecorteBadgeLevel.Alert]: styles.badgeAlert,
}

interface RecorteResultViewProps {
  format: RecorteOutputFormat
  result?: RecorteResult
}

export function RecorteResultView({ format, result }: RecorteResultViewProps): React.ReactElement {
  if (!result) {
    return <p className={styles.pending}>Sin cálculo todavía. Tocá recalcular para generarlo.</p>
  }

  switch (format) {
    case RecorteOutputFormat.Amount:
      return (
        <div className={styles.amountBlock}>
          <span className={styles.amount}>
            {typeof result.amount === 'number'
              ? formatCurrency(result.amount, result.currency ?? Currency.UYU)
              : '—'}
          </span>
          {result.text && <p className={styles.resultText}>{result.text}</p>}
        </div>
      )

    case RecorteOutputFormat.List:
      return (
        <ul className={styles.itemList}>
          {(result.items ?? []).map((it, i) => (
            <li key={i} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.itemLabel}>{it.label}</span>
                {typeof it.amount === 'number' && (
                  <span className={styles.itemAmount}>
                    {it.currency ? formatCurrency(it.amount, it.currency) : it.amount}
                  </span>
                )}
              </div>
              {it.detail && <span className={styles.itemDetail}>{it.detail}</span>}
            </li>
          ))}
          {(result.items ?? []).length === 0 && (
            <li className={styles.pending}>Sin ítems para mostrar.</li>
          )}
        </ul>
      )

    case RecorteOutputFormat.Badge:
      return (
        <div className={styles.badgeBlock}>
          {result.badge && (
            <span className={[styles.badge, BADGE_CLASS[result.badge.level]].join(' ')}>
              {result.badge.label}
            </span>
          )}
          {result.text && <p className={styles.resultText}>{result.text}</p>}
        </div>
      )

    case RecorteOutputFormat.Text:
    default:
      return <p className={styles.resultText}>{result.text || '—'}</p>
  }
}
