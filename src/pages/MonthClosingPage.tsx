// src/pages/MonthClosingPage.tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMonthClosing, useCreateMonthClosing } from '@/hooks/useMonthClosings'
import { useMetrics } from '@/hooks/useMetrics'
import { useRecurringList, useConfirmRecurringPayment } from '@/features/recurring/hooks/useRecurring'
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
          {closing.totalUsd === 0 && closing.totalUyu === 0 ? (
            <p className={styles.emptySection}>No se registraron gastos este mes.</p>
          ) : (
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
          )}
        </div>

        {/* Top categories */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Por categoría</h2>
          {closing.topCategories.length === 0 ? (
            <p className={styles.emptySection}>No se registraron gastos variables este mes.</p>
          ) : (
            <>
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
              <div className={styles.cardTotal}>
                <span className={styles.cardTotalLbl}>Total variables</span>
                <span className={styles.cardTotalAmt}>
                  {[
                    closing.variableUsd > 0 ? `${formatCurrency(closing.variableUsd, Currency.USD)} USD` : '',
                    closing.variableUyu > 0 ? `${formatAmount(closing.variableUyu, Currency.UYU)} UYU` : '',
                  ].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Recurring paid */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Gastos fijos del mes</h2>
          {closing.recurringPaid.length === 0 ? (
            <p className={styles.emptySection}>No se registraron pagos fijos este mes.</p>
          ) : (
            <>
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
              <div className={styles.cardTotal}>
                <span className={styles.cardTotalLbl}>Total fijos</span>
                <span className={styles.cardTotalAmt}>
                  {[
                    closing.fixedUsd > 0 ? `${formatCurrency(closing.fixedUsd, Currency.USD)} USD` : '',
                    closing.fixedUyu > 0 ? `${formatAmount(closing.fixedUyu, Currency.UYU)} UYU` : '',
                  ].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Inline confirm payment row ──────────────────────────────

function RecurringRow({ r, isPastMonth }: { r: ReturnType<typeof useRecurringList>['data'] extends (infer T)[] | undefined ? T : never; isPastMonth: boolean }): React.ReactElement {
  const { mutateAsync: confirmPayment, isPending } = useConfirmRecurringPayment(r.id)
  const isPaid = r.currentMonthStatus === RecurringPaymentStatus.Paid || r.mode === RecurringMode.Auto

  return (
    <div className={styles.recurRow}>
      <span>{r.icon}</span>
      <span className={styles.recurName}>{r.name}</span>
      <span className={[styles.modeBadge, r.mode === RecurringMode.Auto ? styles.modeAuto : styles.modeManual].join(' ')}>
        {r.mode === RecurringMode.Auto ? 'Auto' : 'Manual'}
      </span>
      <span className={styles.recurAmt}>{formatCurrency(r.amount, r.currency)} {r.currency}</span>
      {!isPaid && (isPastMonth || r.mode === RecurringMode.Manual) && (
        <button
          className={styles.markPaidBtn}
          disabled={isPending}
          onClick={() => void confirmPayment({ amount: r.amount })}
        >
          {isPending ? '...' : 'Marcar pagado'}
        </button>
      )}
      {isPaid && <span className={styles.paidCheck}>✓</span>}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────

export default function MonthClosingPage(): React.ReactElement {
  const { yearMonth } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()

  const { data: existing, isLoading: loadingExisting } = useMonthClosing(yearMonth ?? '')
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()
  const { mutateAsync: createClosing, isPending: creating } = useCreateMonthClosing()

  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = yearMonth === currentYearMonth
  const isPastMonth = !!yearMonth && !isCurrentMonth
  const { data: metrics, isLoading: loadingMetrics } = useMetrics(MetricsPeriod.Month, isPastMonth ? yearMonth : undefined)

  const [targetYear, targetMonth] = (yearMonth ?? currentYearMonth).split('-').map(Number) as [number, number]
  const monthName = `${MONTH_NAMES[targetMonth - 1] ?? ''} ${targetYear}`

  if (loadingExisting || loadingMetrics || loadingRecurring) return <LoadingSpinner fullPage />

  // Show saved detail if exists
  if (existing) return <ClosingDetail closing={existing} />

  if (!metrics) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        </header>
        <div className={styles.body}>
          <p className={styles.noData}>No se pudieron cargar las métricas del mes.</p>
        </div>
      </div>
    )
  }

  const pendingRecurring = isCurrentMonth
    ? recurring.filter((r) => r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending)
    : []
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
    const fixedUsd = recurringPaid.filter((r) => r.currency === Currency.USD).reduce((s, r) => s + r.amount, 0)
    const fixedUyu = recurringPaid.filter((r) => r.currency === Currency.UYU).reduce((s, r) => s + r.amount, 0)
    await createClosing({
      id: yearMonth,
      year: targetYear,
      month: targetMonth,
      totalUsd: metrics.variableUsd + fixedUsd,
      totalUyu: metrics.variableUyu + fixedUyu,
      variableUsd: metrics.variableUsd,
      variableUyu: metrics.variableUyu,
      fixedUsd,
      fixedUyu,
      recurringPaid,
      topCategories,
    })
    // Don't navigate — React Query invalidation will set `existing` and render ClosingDetail
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        </div>
        <h1 className={styles.title}>Cerrar {monthName}</h1>
        {isPastMonth && <p className={styles.pastBadge}>⚠️ Mes pasado sin cerrar</p>}
        <p className={styles.subtitle}>Esta acción es definitiva y no se puede deshacer.</p>
      </header>

      <div className={styles.body}>
        {/* Pending blocker (current month only) */}
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
          {metrics.totalUsd === 0 && metrics.totalUyu === 0 ? (
            <p className={styles.emptySection}>No se registraron gastos este mes.</p>
          ) : (
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
          )}
        </div>

        {/* Categories */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Por categoría</h2>
          {metrics.byCategory.length === 0 ? (
            <p className={styles.emptySection}>No se registraron gastos variables este mes.</p>
          ) : (
            <>
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
              <div className={styles.cardTotal}>
                <span className={styles.cardTotalLbl}>Total variables</span>
                <span className={styles.cardTotalAmt}>
                  {[
                    metrics.variableUsd > 0 ? `${formatCurrency(metrics.variableUsd, Currency.USD)} USD` : '',
                    metrics.variableUyu > 0 ? `${formatAmount(metrics.variableUyu, Currency.UYU)} UYU` : '',
                  ].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Recurring — all of them, markable if unpaid */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Gastos fijos del mes</h2>
          {recurring.length === 0 ? (
            <p className={styles.emptySection}>No hay gastos fijos configurados.</p>
          ) : (
            <>
              {recurring.map((r) => (
                <RecurringRow key={r.id} r={r} isPastMonth={isPastMonth} />
              ))}
              {(() => {
                const fUsd = recurring.filter((r) => r.currency === Currency.USD && (r.mode === RecurringMode.Auto || r.currentMonthStatus === RecurringPaymentStatus.Paid)).reduce((s, r) => s + r.amount, 0)
                const fUyu = recurring.filter((r) => r.currency === Currency.UYU && (r.mode === RecurringMode.Auto || r.currentMonthStatus === RecurringPaymentStatus.Paid)).reduce((s, r) => s + r.amount, 0)
                return (fUsd > 0 || fUyu > 0) ? (
                  <div className={styles.cardTotal}>
                    <span className={styles.cardTotalLbl}>Total fijos</span>
                    <span className={styles.cardTotalAmt}>
                      {[
                        fUsd > 0 ? `${formatCurrency(fUsd, Currency.USD)} USD` : '',
                        fUyu > 0 ? `${formatAmount(fUyu, Currency.UYU)} UYU` : '',
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>

        {/* Close button */}
        {canClose && (
          <Button
            variant="secondary"
            fullWidth
            loading={creating}
            onClick={() => void handleClose()}
          >
            {isPastMonth ? `Registrar cierre de ${monthName}` : `Cerrar ${monthName}`}
          </Button>
        )}
      </div>
    </div>
  )
}
