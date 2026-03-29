// src/pages/MonthClosingPage.tsx
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMonthClosing, useCreateMonthClosing } from '@/hooks/useMonthClosings'
import { useMetrics } from '@/hooks/useMetrics'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import { MetricsPeriod, Currency, RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import type { MonthClosing } from '@/types/models'
import styles from './MonthClosingPage.module.css'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function ClosingDetail({ closing }: { closing: MonthClosing }): React.ReactElement {
  const navigate = useNavigate()
  const closedDate = new Date(closing.closedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
  const monthName = `${MONTH_NAMES[closing.month - 1] ?? ''} ${closing.year}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
          <span className={styles.closedBadge}>✓ Cerrado</span>
        </div>
        <h1 className={styles.title}>Reporte {monthName}</h1>
        <p className={styles.closedDate}>Cerrado el {closedDate}</p>
      </header>

      <div className={styles.body}>
        {/* Totals */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resumen del mes</h2>
          <div className={styles.totalGrid}>
            {closing.totalUsd > 0 && (
              <div className={styles.totalBlock}>
                <p className={styles.totalLbl}>🇺🇸 Total USD</p>
                <p className={styles.totalAmt}>{formatAmount(closing.totalUsd, Currency.USD)}</p>
              </div>
            )}
            {closing.totalUyu > 0 && (
              <div className={styles.totalBlock}>
                <p className={styles.totalLbl}>🇺🇾 Total UYU</p>
                <p className={styles.totalAmt}>{formatAmount(closing.totalUyu, Currency.UYU)}</p>
              </div>
            )}
          </div>
          <div className={styles.splitRow}>
            <div className={styles.splitItem}>
              <span className={styles.splitLbl}>Fijos</span>
              <span className={styles.splitVal}>
                {[
                  closing.fixedUsd > 0 ? `${formatCurrency(closing.fixedUsd, Currency.USD)} USD` : '',
                  closing.fixedUyu > 0 ? `${formatAmount(closing.fixedUyu, Currency.UYU)} UYU` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className={styles.splitItem}>
              <span className={styles.splitLbl}>Variables</span>
              <span className={styles.splitVal}>
                {[
                  closing.variableUsd > 0 ? `${formatCurrency(closing.variableUsd, Currency.USD)} USD` : '',
                  closing.variableUyu > 0 ? `${formatAmount(closing.variableUyu, Currency.UYU)} UYU` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        </div>

        {/* Top categories */}
        {closing.topCategories.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Por categoría</h2>
            {closing.topCategories.map((cat) => (
              <div key={cat.categoryId} className={styles.catRow}>
                <span className={styles.catIcon}>{cat.categoryIcon}</span>
                <span className={styles.catName}>{cat.categoryName}</span>
                <span className={styles.catAmt}>
                  {[
                    cat.usd > 0 ? `${formatCurrency(cat.usd, Currency.USD)} USD` : '',
                    cat.uyu > 0 ? `${formatAmount(cat.uyu, Currency.UYU)} UYU` : '',
                  ].filter(Boolean).join(' + ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recurring paid */}
        {closing.recurringPaid.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Gastos fijos del mes</h2>
            {closing.recurringPaid.map((r) => (
              <div key={r.recurringId} className={styles.recurRow}>
                <span>{r.icon}</span>
                <span className={styles.recurName}>{r.name}</span>
                <span className={[styles.modeBadge, r.mode === RecurringMode.Auto ? styles.modeAuto : styles.modeManual].join(' ')}>
                  {r.mode === RecurringMode.Auto ? 'Auto' : 'Manual'}
                </span>
                <span className={styles.recurAmt}>{formatCurrency(r.amount, r.currency)} {r.currency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MonthClosingPage(): React.ReactElement {
  const { yearMonth } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)

  const { data: existing, isLoading: loadingExisting } = useMonthClosing(yearMonth ?? '')
  const { data: metrics, isLoading: loadingMetrics } = useMetrics(MetricsPeriod.Month)
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()
  const { mutateAsync: createClosing, isPending: creating } = useCreateMonthClosing()

  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = yearMonth === currentYearMonth

  if (loadingExisting || loadingMetrics || loadingRecurring) return <LoadingSpinner fullPage />

  // Show saved detail if exists
  if (existing) return <ClosingDetail closing={existing} />

  // Not current month and no closing → nothing to show
  if (!isCurrentMonth || !metrics) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        </header>
        <div className={styles.body}>
          <p className={styles.noData}>Este mes no tiene un cierre registrado.</p>
        </div>
      </div>
    )
  }

  const monthName = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`
  const pendingRecurring = recurring.filter(
    (r) => r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending,
  )
  const canClose = pendingRecurring.length === 0

  async function handleClose(): Promise<void> {
    if (!metrics || !yearMonth) return
    const recurringPaid = recurring
      .filter((r) => r.currentMonthStatus === RecurringPaymentStatus.Paid || r.mode === RecurringMode.Auto)
      .map((r) => ({
        recurringId: r.id,
        name: r.name,
        icon: r.icon,
        amount: r.amount,
        currency: r.currency,
        mode: r.mode,
        frequency: r.frequency,
      }))
    const topCategories = metrics.byCategory.slice(0, 5).map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryIcon: c.categoryIcon,
      usd: c.usd,
      uyu: c.uyu,
    }))
    await createClosing({
      id: yearMonth,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      totalUsd: metrics.totalUsd,
      totalUyu: metrics.totalUyu,
      variableUsd: metrics.variableUsd,
      variableUyu: metrics.variableUyu,
      fixedUsd: metrics.fixedUsd,
      fixedUyu: metrics.fixedUyu,
      recurringPaid,
      topCategories,
    })
    navigate(`/settings/reports/${yearMonth}`)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        </div>
        <h1 className={styles.title}>Cerrar {monthName}</h1>
        <p className={styles.subtitle}>Esta acción es definitiva y no se puede deshacer.</p>
      </header>

      <div className={styles.body}>
        {/* Pending blocker */}
        {pendingRecurring.length > 0 && (
          <div className={styles.blocker}>
            <p className={styles.blockerTitle}>⚠️ No podés cerrar el mes todavía</p>
            <p className={styles.blockerSub}>Hay pagos manuales pendientes de confirmar:</p>
            {pendingRecurring.map((r) => (
              <button
                key={r.id}
                className={styles.blockerItem}
                onClick={() => navigate(`/settings/recurring/${r.id}`)}
              >
                <span>{r.icon} {r.name}</span>
                <span className={styles.blockerAmt}>{formatCurrency(r.amount, r.currency)} {r.currency} →</span>
              </button>
            ))}
          </div>
        )}

        {/* Month summary */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resumen del mes</h2>
          <div className={styles.totalGrid}>
            {metrics.totalUsd > 0 && (
              <div className={styles.totalBlock}>
                <p className={styles.totalLbl}>🇺🇸 Total USD</p>
                <p className={styles.totalAmt}>{formatAmount(metrics.totalUsd, Currency.USD)}</p>
              </div>
            )}
            {metrics.totalUyu > 0 && (
              <div className={styles.totalBlock}>
                <p className={styles.totalLbl}>🇺🇾 Total UYU</p>
                <p className={styles.totalAmt}>{formatAmount(metrics.totalUyu, Currency.UYU)}</p>
              </div>
            )}
          </div>
          <div className={styles.splitRow}>
            <div className={styles.splitItem}>
              <span className={styles.splitLbl}>Fijos</span>
              <span className={styles.splitVal}>
                {[
                  metrics.fixedUsd > 0 ? `${formatCurrency(metrics.fixedUsd, Currency.USD)} USD` : '',
                  metrics.fixedUyu > 0 ? `${formatAmount(metrics.fixedUyu, Currency.UYU)} UYU` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className={styles.splitItem}>
              <span className={styles.splitLbl}>Variables</span>
              <span className={styles.splitVal}>
                {[
                  metrics.variableUsd > 0 ? `${formatCurrency(metrics.variableUsd, Currency.USD)} USD` : '',
                  metrics.variableUyu > 0 ? `${formatAmount(metrics.variableUyu, Currency.UYU)} UYU` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        </div>

        {/* Categories */}
        {metrics.byCategory.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Por categoría</h2>
            {metrics.byCategory.slice(0, 5).map((cat) => (
              <div key={cat.categoryId} className={styles.catRow}>
                <span className={styles.catIcon}>{cat.categoryIcon}</span>
                <span className={styles.catName}>{cat.categoryName}</span>
                <span className={styles.catAmt}>
                  {[
                    cat.usd > 0 ? `${formatCurrency(cat.usd, Currency.USD)} USD` : '',
                    cat.uyu > 0 ? `${formatAmount(cat.uyu, Currency.UYU)} UYU` : '',
                  ].filter(Boolean).join(' + ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Confirm checkbox + button */}
        {canClose && (
          <div className={styles.confirmSection}>
            <label className={styles.confirmCheck}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>Confirmo que los datos del mes son correctos y quiero cerrar definitivamente.</span>
            </label>
            <Button
              variant="secondary"
              fullWidth
              disabled={!confirmed}
              loading={creating}
              onClick={() => void handleClose()}
            >
              Cerrar {monthName}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
