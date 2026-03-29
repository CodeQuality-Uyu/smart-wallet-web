// src/pages/ReportsPage.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMonthClosings } from '@/hooks/useMonthClosings'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatAmount } from '@/utils/formatCurrency'
import { Currency, RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import styles from './ReportsPage.module.css'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReportsPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: closings = [], isLoading: loadingClosings } = useMonthClosings()
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()

  if (loadingClosings || loadingRecurring) return <LoadingSpinner fullPage />

  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`
  const currentClosing = closings.find((c) => c.id === currentYearMonth)
  const pastClosings = closings.filter((c) => c.id !== currentYearMonth)

  const pendingRecurring = recurring.filter(
    (r) => r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending,
  )

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Cierres mensuales e historial de gastos" showBack />

      <div className={styles.body}>
        {/* ── Mes actual ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Mes actual</p>
          <button
            className={styles.currentCard}
            onClick={() => navigate(`/settings/reports/${currentYearMonth}`)}
          >
            <div className={styles.currentLeft}>
              <p className={styles.currentMonth}>{monthLabel}</p>
              {currentClosing ? (
                <p className={styles.statusClosed}>
                  ✓ Cerrado el {new Date(currentClosing.closedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })}
                </p>
              ) : pendingRecurring.length > 0 ? (
                <p className={styles.statusPending}>
                  ⚠️ {pendingRecurring.length} pago{pendingRecurring.length > 1 ? 's' : ''} manual{pendingRecurring.length > 1 ? 'es' : ''} pendiente{pendingRecurring.length > 1 ? 's' : ''}
                </p>
              ) : (
                <p className={styles.statusReady}>✅ Listo para cerrar</p>
              )}
            </div>
            <span className={styles.arrow}>
              {currentClosing ? 'Ver →' : 'Generar →'}
            </span>
          </button>
        </div>

        {/* ── Historial ── */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Historial</p>
          {pastClosings.length === 0 ? (
            <p className={styles.empty}>No hay cierres anteriores registrados.</p>
          ) : (
            <>
              {pastClosings.map((closing) => {
                const monthName = `${MONTH_NAMES[closing.month - 1] ?? ''} ${closing.year}`
                const closedDate = new Date(closing.closedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <button
                    key={closing.id}
                    className={styles.row}
                    onClick={() => navigate(`/settings/reports/${closing.id}`)}
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
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
