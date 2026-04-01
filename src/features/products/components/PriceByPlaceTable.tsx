// src/features/products/components/PriceByPlaceTable.tsx
// Columns: Local | Último precio | Hace cuántos días | Δ vs más barato
// Row color reflects data confidence (fresh / stale / old).

import React from 'react'
import type { PriceByPlace } from '@/backend/types'
import { getPriceDataConfidence, PriceDataConfidence } from '@/utils/getPriceDataConfidence'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './PriceByPlaceTable.module.css'

interface PriceByPlaceTableProps {
  rows: PriceByPlace[]
  onEdit?: (row: PriceByPlace) => void
}

function daysAgo(recordedAt: string): number {
  return Math.floor((Date.now() - new Date(recordedAt).getTime()) / (1000 * 60 * 60 * 24))
}

function daysLabel(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

const CONFIDENCE_CLASS: Record<PriceDataConfidence, string> = {
  [PriceDataConfidence.Fresh]: styles.rowFresh,
  [PriceDataConfidence.Stale]: styles.rowStale,
  [PriceDataConfidence.Old]:   styles.rowOld,
}

export function PriceByPlaceTable({ rows, onEdit }: PriceByPlaceTableProps): React.ReactElement {
  if (rows.length === 0) {
    return <p className={styles.empty}>Sin registros de precios aún.</p>
  }

  const sorted = [...rows].sort((a, b) => a.unitPrice - b.unitPrice)

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Local</th>
            <th className={[styles.th, styles.right].join(' ')}>Último precio</th>
            <th className={[styles.th, styles.right].join(' ')}>Actualización</th>
            <th className={[styles.th, styles.right].join(' ')}>vs más barato</th>
            {onEdit && <th className={styles.th} />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const confidence = getPriceDataConfidence(row.recordedAt)
            const days = daysAgo(row.recordedAt)
            const isCheapest = row.diffPct === 0

            return (
              <tr
                key={row.placeId}
                className={[styles.tr, CONFIDENCE_CLASS[confidence]].join(' ')}
              >
                <td className={styles.td}>
                  <span className={styles.placeName}>{row.placeName}</span>
                </td>
                <td className={[styles.td, styles.right].join(' ')}>
                  <span className={styles.price}>
                    {formatCurrency(row.unitPrice, row.currency)}
                  </span>
                  {isCheapest && (
                    <span className={styles.cheapestBadge} title="Más barato">↓</span>
                  )}
                </td>
                <td className={[styles.td, styles.right, styles.muted].join(' ')}>
                  {daysLabel(days)}
                </td>
                <td className={[styles.td, styles.right].join(' ')}>
                  {isCheapest ? (
                    <span className={styles.cheapest}>—</span>
                  ) : (
                    <span className={styles.diff}>+{row.diffPct.toFixed(1)}%</span>
                  )}
                </td>
                {onEdit && (
                  <td className={styles.td}>
                    <button className={styles.editBtn} onClick={() => onEdit(row)} type="button">
                      ✏️
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className={styles.legend}>
        <span className={[styles.dot, styles.dotFresh].join(' ')} /> Reciente (&lt;30 días)
        <span className={[styles.dot, styles.dotStale].join(' ')} /> Antiguo (30–90 días)
        <span className={[styles.dot, styles.dotOld].join(' ')} /> Muy antiguo (&gt;90 días)
      </div>
    </div>
  )
}
