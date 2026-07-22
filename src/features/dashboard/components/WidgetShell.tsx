// src/features/dashboard/components/WidgetShell.tsx
//
// Marco presentacional común de un widget: card + cabecera (ícono, título,
// período, acción) + acento de color. El cuerpo lo aporta cada engine.

import React from 'react'
import type { PeriodFilter } from '@/types/enums'
import { PERIOD_LABELS } from '../periods'
import styles from './WidgetShell.module.css'

export interface WidgetShellProps {
  title: string
  icon?: string
  color?: string
  period?: PeriodFilter
  action?: React.ReactNode
  /** Manija de arrastre (drag handle), va al inicio de la cabecera. */
  dragHandle?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function WidgetShell({
  title,
  icon,
  color,
  period,
  action,
  dragHandle,
  className,
  children,
}: WidgetShellProps): React.ReactElement {
  return (
    <div
      className={[styles.card, className ?? ''].join(' ')}
      style={color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
    >
      <div className={styles.cardTop}>
        {dragHandle}
        {icon && <span className={styles.cardIcon}>{icon}</span>}
        <span className={styles.cardTitle}>{title || 'Sin título'}</span>
        {period && <span className={styles.cardPeriod}>{PERIOD_LABELS[period]}</span>}
        {action && <div className={styles.cardMenu}>{action}</div>}
      </div>
      {children}
    </div>
  )
}
