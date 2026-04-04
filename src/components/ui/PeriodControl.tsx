// src/components/ui/PeriodControl.tsx

import React, { useCallback } from 'react'
import { PERIODS, type PeriodOption } from './PeriodControl.constants'
import styles from './PeriodControl.module.css'
import { PeriodFilter } from '../../types'

interface PeriodControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options?: PeriodOption<T>[]
}

export function PeriodControl<T extends string>({
  value,
  onChange,
  options = PERIODS as unknown as PeriodOption<T>[],
}: PeriodControlProps<T>): React.ReactElement {
  return (
    <div className={styles.control}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={[styles.btn, value === opt.value ? styles.btnActive : ''].join(' ')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface PeriodDescriptionProps {
  period: PeriodFilter
}
export function PeriodDescription({ period }: PeriodDescriptionProps): React.ReactElement {
  const getPeriodRange = useCallback((p: PeriodFilter): string => {
    const now = new Date()
    const fmt = (d: Date) => d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
    switch (p) {
      case PeriodFilter.SevenDays: {
        const from = new Date(now)
        from.setDate(from.getDate() - 6)
        return `${fmt(from)} – ${fmt(now)}`
      }
      case PeriodFilter.ThreeMonths: {
        const from = new Date(now)
        from.setMonth(from.getMonth() - 3)
        return `${fmt(from)} – ${fmt(now)}`
      }
      case PeriodFilter.Year: {
        const from = new Date(now.getFullYear(), 0, 1)
        return `${fmt(from)} – ${fmt(now)}`
      }
      default: {
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        return `${fmt(from)} – ${fmt(now)}`
      }
    }
  }, [])

  return (
    <p className={styles.desktopSubtitle}>
      Desde {getPeriodRange(period).split('–')[0].trim()} hasta{' '}
      {getPeriodRange(period).split('–')[1].trim()}
    </p>
  )
}
