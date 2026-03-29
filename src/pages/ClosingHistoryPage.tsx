// src/pages/ClosingHistoryPage.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMonthClosings } from '@/hooks/useMonthClosings'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatAmount } from '@/utils/formatCurrency'
import { Currency } from '@/types/enums'
import styles from './ClosingHistoryPage.module.css'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ClosingHistoryPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: closings = [], isLoading } = useMonthClosings()

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div className={styles.page}>
      <PageHeader title="Historial de cierres" />

      <div className={styles.body}>
        {closings.length === 0 ? (
          <p className={styles.empty}>No hay cierres registrados todavía.</p>
        ) : (
          closings.map((closing) => {
            const monthName = `${MONTH_NAMES[closing.month - 1] ?? ''} ${closing.year}`
            const closedDate = new Date(closing.closedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <button
                key={closing.id}
                className={styles.row}
                onClick={() => navigate(`/closings/${closing.id}`)}
              >
                <div className={styles.rowLeft}>
                  <p className={styles.rowMonth}>{monthName}</p>
                  <p className={styles.rowDate}>Cerrado el {closedDate}</p>
                </div>
                <div className={styles.rowRight}>
                  {closing.totalUsd > 0 && (
                    <p className={styles.rowAmt}>{formatAmount(closing.totalUsd, Currency.USD)} USD</p>
                  )}
                  {closing.totalUyu > 0 && (
                    <p className={styles.rowAmt}>{formatAmount(closing.totalUyu, Currency.UYU)} UYU</p>
                  )}
                  <span className={styles.arrow}>→</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
