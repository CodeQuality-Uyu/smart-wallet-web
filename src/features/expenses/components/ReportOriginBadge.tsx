// src/features/expenses/components/ReportOriginBadge.tsx

import React from 'react'
import type { Expense } from '@/types/models'
import { useReportAttachment } from '@/hooks/useReportAttachments'
import styles from './ReportOriginBadge.module.css'

interface ReportOriginBadgeProps {
  expense: Expense
  className?: string
}

/**
 * Muestra un badge "📄 Reporte" cuando el gasto fue importado desde un reporte.
 * Si el reporte de origen está disponible, el badge abre el archivo en una pestaña nueva.
 * Se usa tanto en el listado de gastos como en el listado de inicio.
 */
export function ReportOriginBadge({
  expense,
  className,
}: ReportOriginBadgeProps): React.ReactElement | null {
  const isImported = expense.importedFrom === 'statement'
  const { data: attachment } = useReportAttachment(
    isImported ? expense.statementAttachmentId : undefined,
  )

  if (!isImported) return null

  if (attachment?.url) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={[styles.badge, className].filter(Boolean).join(' ')}
        onClick={(e) => {
          e.stopPropagation()
          window.open(attachment.url, '_blank', 'noopener,noreferrer')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            e.preventDefault()
            window.open(attachment.url, '_blank', 'noopener,noreferrer')
          }
        }}
        title={`Cargado desde reporte: ${attachment.name}`}
        aria-label="Ver reporte de origen"
      >
        📄 Reporte
      </span>
    )
  }

  return (
    <span
      className={[styles.badgeStatic, className].filter(Boolean).join(' ')}
      title="Cargado desde un reporte"
    >
      📄 Reporte
    </span>
  )
}
