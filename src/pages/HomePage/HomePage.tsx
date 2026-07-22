// src/pages/HomePage.tsx

import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import {
  useRecurringList,
  useConfirmRecurringPayment,
  useSkipRecurringMonth,
} from '@/features/recurring/hooks/useRecurring'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { KebabMenu, type KebabMenuItem } from '@/components/shared/KebabMenu'
import { Modal } from '@/components/ui/Modal'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import {
  confirmPaymentSchema,
  type ConfirmPaymentFormValues,
} from '@/features/recurring/schemas/confirmPaymentSchema'
import { DashboardWidgets } from '@/features/dashboard/components/DashboardWidgets'
import { formatCurrency } from '@/utils/formatCurrency'
import {
  PeriodFilter,
  Currency,
  RecurringMode,
  RecurringPaymentStatus,
  RecurringStatus,
} from '@/types/enums'
import { computeOverdueMonths } from '@/utils/recurringSchedule'
import { useAuth } from '@/app/providers/AuthContext'
import type { RecurringExpense } from '@/types/models'
import styles from './HomePage.module.css'

interface OverdueEntry {
  item: { id: string; name: string; icon: string; amount: number; currency: Currency }
  missedMonths: Array<{ month: number; year: number }>
}

// Fila de pago pendiente con menú de acciones (Pagar / Omitir). Es su propio
// componente para poder usar los hooks por-id sin romper las reglas de hooks.
function PendingPaymentRow({
  r,
  onNavigate,
}: {
  r: RecurringExpense
  onNavigate: (id: string) => void
}): React.ReactElement {
  const { mutateAsync: confirmPayment, isPending: paying } = useConfirmRecurringPayment(r.id)
  const { mutateAsync: skipMonth, isPending: skipping } = useSkipRecurringMonth(r.id)
  const [showPayModal, setShowPayModal] = useState(false)
  const receiptFileInputRef = useRef<HTMLInputElement>(null)
  const busy = paying || skipping

  async function handleConfirmPay(values: ConfirmPaymentFormValues): Promise<void> {
    await confirmPayment({ amount: values.amount, receiptFile: values.receiptFile ?? undefined })
    setShowPayModal(false)
  }

  async function handleSkip(): Promise<void> {
    const now = new Date()
    await skipMonth({ month: now.getMonth() + 1, year: now.getFullYear() })
  }

  const menuItems: KebabMenuItem[] = [
    { label: 'Pagar', icon: '💳', onClick: () => setShowPayModal(true) },
    { label: 'Omitir', icon: '⊘', onClick: () => void handleSkip() },
  ]

  return (
    <div className={styles.pendingRow}>
      <button
        className={styles.desktopRecurringRow}
        onClick={() => onNavigate(r.id)}
        disabled={busy}
      >
        <span className={styles.desktopRecurringIcon}>{r.icon}</span>
        <div className={styles.desktopRecurringInfo}>
          <span className={styles.desktopRecurringName}>{r.name}</span>
          {r.dueDayOfMonth && (
            <span className={styles.desktopRecurringDue}>Vence el día {r.dueDayOfMonth}</span>
          )}
        </div>
        <span className={styles.desktopRecurringAmt}>{formatCurrency(r.amount, r.currency)}</span>
      </button>
      <div className={styles.pendingMenuWrap}>
        <KebabMenu items={menuItems} ariaLabel="Acciones del pago" loading={busy} />
      </div>

      {showPayModal && (
        <Modal title={`Pagar · ${r.name}`} onClose={() => setShowPayModal(false)} width={440}>
          <Formik<ConfirmPaymentFormValues>
            initialValues={{ amount: r.amount, receiptFile: undefined }}
            validationSchema={confirmPaymentSchema}
            onSubmit={handleConfirmPay}
          >
            {({ isSubmitting, setFieldValue, values, errors, touched }) => (
              <Form>
                <FormField name="amount" label="Monto de esta factura">
                  <TextInput name="amount" type="number" inputMode="decimal" icon="$" />
                </FormField>

                <input
                  ref={receiptFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    void setFieldValue('receiptFile', file)
                  }}
                />
                <div
                  className={styles.payUploadArea}
                  onClick={() => receiptFileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && receiptFileInputRef.current?.click()}
                >
                  {values.receiptFile ? (
                    <p>📄 {values.receiptFile.name}</p>
                  ) : (
                    <p>
                      📄 Subir comprobante{' '}
                      <span style={{ color: 'var(--muted)' }}>(opcional)</span>
                    </p>
                  )}
                </div>
                {touched.receiptFile && errors.receiptFile && (
                  <p className={styles.payFieldError}>{errors.receiptFile as string}</p>
                )}

                <div className={styles.payFormActions}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPayModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                    Confirmar pago
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Modal>
      )}
    </div>
  )
}

function getOverdueItems(
  recurring: import('@/types/models').RecurringExpense[]
): OverdueEntry[] {
  const now = new Date()
  return recurring
    .filter((r) => r.status === RecurringStatus.Active && r.mode === RecurringMode.Manual)
    .map((r) => ({ item: r, missedMonths: computeOverdueMonths(r, now) }))
    .filter((entry) => entry.missedMonths.length > 0)
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  useAuth()
  const {
    data: metrics,
    isLoading: loadingMetrics,
    error: metricsError,
    refetch,
  } = useMetrics(PeriodFilter.Month)
  const { data: budget, isLoading: loadingBudget } = useBudget()
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringList()

  if (loadingMetrics || loadingBudget || loadingRecurring) {
    return <LoadingSpinner fullPage />
  }
  if (metricsError || !metrics) return <ErrorMessage onRetry={() => void refetch()} />

  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()] ?? ''} ${now.getFullYear()}`

  // ── Average from previous 5 months ────────────────────────
  const prevMonths = metrics.monthlyHistory.slice(0, -1)
  const avgUsd =
    prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.usd, 0) / prevMonths.length : 0
  const avgUyu =
    prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.uyu, 0) / prevMonths.length : 0
  const vsAvgUsd = avgUsd > 0 ? Math.round(((metrics.totalUsd - avgUsd) / avgUsd) * 100) : 0
  const vsAvgUyu = avgUyu > 0 ? Math.round(((metrics.totalUyu - avgUyu) / avgUyu) * 100) : 0

  // ── Category growth (top 3 by delta %) ───────────────────
  const categoryGrowth = metrics.byCategory
    .map((cat) => {
      const prev = metrics.previousByCategory.find((p) => p.categoryId === cat.categoryId)
      const prevVal = (prev?.usd ?? 0) + (prev?.uyu ?? 0) / 100
      const curVal = cat.usd + cat.uyu / 100
      const delta =
        prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : curVal > 0 ? 100 : 0
      return { ...cat, delta, curVal }
    })
    .filter((c) => c.curVal > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  const catGrandTotalForTips = metrics.byCategory.reduce((s, c) => s + c.usd * 100 + c.uyu, 0)

  // ── Upcoming / pending recurring ─────────────────────────
  const pendingRecurring = recurring.filter(
    (r) =>
      r.mode === RecurringMode.Manual && r.currentMonthStatus === RecurringPaymentStatus.Pending
  )
  const overdueItems = getOverdueItems(recurring)
  const currentYear = now.getFullYear()
  // ── Savings tips ──────────────────────────────────────────
  const tips: { icon: string; text: string; type: 'success' | 'warn' | 'info' }[] = []

  // Budget exceeded
  if (budget?.usd && metrics.totalUsd > budget.usd) {
    const over = formatCurrency(metrics.totalUsd - budget.usd, Currency.USD)
    tips.push({
      icon: '⚠️',
      text: `Superaste tu presupuesto USD en ${over} este mes.`,
      type: 'warn',
    })
  } else if (budget?.usd && metrics.totalUsd / budget.usd >= 0.8) {
    const remaining = formatCurrency(budget.usd - metrics.totalUsd, Currency.USD)
    const pct = Math.round((metrics.totalUsd / budget.usd) * 100)
    tips.push({
      icon: '📊',
      text: `Usaste el ${pct}% de tu presupuesto USD. Te quedan ${remaining}.`,
      type: 'warn',
    })
  }
  if (budget?.uyu && metrics.totalUyu > budget.uyu) {
    const over = formatCurrency(metrics.totalUyu - budget.uyu, Currency.UYU)
    tips.push({
      icon: '⚠️',
      text: `Superaste tu presupuesto UYU en ${over} este mes.`,
      type: 'warn',
    })
  }

  // Below historical average
  if (avgUsd > 0 && vsAvgUsd <= -10) {
    tips.push({
      icon: '🎉',
      text: `Estás gastando un ${Math.abs(vsAvgUsd)}% menos que tu promedio histórico en USD. ¡Buen ritmo!`,
      type: 'success',
    })
  } else if (avgUsd > 0 && vsAvgUsd >= 20) {
    tips.push({
      icon: '📈',
      text: `Gastaste un ${vsAvgUsd}% más que tu promedio en USD. Revisá tus gastos variables.`,
      type: 'warn',
    })
  }
  if (avgUyu > 0 && vsAvgUyu <= -10) {
    tips.push({
      icon: '🎉',
      text: `Gastaste un ${Math.abs(vsAvgUyu)}% menos que tu promedio en UYU. ¡Vas bien!`,
      type: 'success',
    })
  }

  // Top growing category
  const topGrowth = categoryGrowth.find((c) => c.delta > 20)
  if (topGrowth) {
    const prevCat = metrics.previousByCategory.find((p) => p.categoryId === topGrowth.categoryId)
    const prevAmt =
      (prevCat?.usd ?? 0) > 0
        ? formatCurrency(prevCat?.usd ?? 0, Currency.USD)
        : formatCurrency(prevCat?.uyu ?? 0, Currency.UYU)
    const curAmt =
      topGrowth.usd > 0
        ? formatCurrency(topGrowth.usd, Currency.USD)
        : formatCurrency(topGrowth.uyu, Currency.UYU)
    tips.push({
      icon: topGrowth.categoryIcon,
      text: `Tu gasto en ${topGrowth.categoryName} subió un ${topGrowth.delta}% (${prevAmt} → ${curAmt}).`,
      type: 'info',
    })
  }

  // Top category share
  if (metrics.byCategory.length > 0 && catGrandTotalForTips > 0) {
    const top = metrics.byCategory[0]
    const topNorm = top ? top.usd * 100 + top.uyu : 0
    const pct = Math.round((topNorm / catGrandTotalForTips) * 100)
    if (pct >= 30 && top) {
      const amt =
        top.usd > 0 ? formatCurrency(top.usd, Currency.USD) : formatCurrency(top.uyu, Currency.UYU)
      tips.push({
        icon: top.categoryIcon,
        text: `${top.categoryName} representa el ${pct}% de tu gasto total (${amt}).`,
        type: 'info',
      })
    }
  }

  const shownTips = tips.slice(0, 3)

  return (
      <div className={styles.desktopGrid}>
        {/* Right: column of independent cards */}
        <div className={styles.desktopRightCol}>
          {/* Visualizadores configurables por el usuario */}
          <div className={styles.desktopMainBox}>
            <p className={styles.desktopSubtitle}>{monthLabel}</p>
            <DashboardWidgets />
          </div>
        </div>

        {/* Sidebar: pending payments + tips + categories */}
        <div className={styles.desktopSidebar}>
          {overdueItems.length > 0 && (
            <>
              <h2 className={styles.desktopSectionTitle}>⚠️ Sin pagar — meses anteriores</h2>
              <div className={[styles.desktopCard, styles.overdueCard].join(' ')}>
                {overdueItems.map(({ item, missedMonths }) => {
                  const monthsLabel = missedMonths
                    .map(({ month, year }) =>
                      year === currentYear ? MONTH_NAMES[month - 1] : `${MONTH_NAMES[month - 1]} ${year}`
                    )
                    .join(', ')
                  return (
                    <button
                      key={item.id}
                      className={styles.desktopRecurringRow}
                      onClick={() => void navigate(`/settings/recurring/${item.id}`)}
                    >
                      <span className={styles.desktopRecurringIcon}>{item.icon || '💳'}</span>
                      <div className={styles.desktopRecurringInfo}>
                        <span className={styles.desktopRecurringName}>{item.name}</span>
                        <span className={styles.desktopRecurringDue}>Sin pagar: {monthsLabel}</span>
                      </div>
                      <span className={styles.desktopRecurringAmt}>
                        {formatCurrency(item.amount, item.currency)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          <h2 className={[styles.desktopSectionTitle, overdueItems.length > 0 ? styles.desktopSidebarSection : ''].join(' ').trim()}>Pagos pendientes</h2>
          <div className={styles.desktopCard}>
            {pendingRecurring.length === 0 ? (
              <div className={styles.desktopAllPaid}>✅ Todos los pagos al día</div>
            ) : (
              pendingRecurring.map((r) => (
                <PendingPaymentRow
                  key={r.id}
                  r={r}
                  onNavigate={(id) => void navigate(`/settings/recurring/${id}`)}
                />
              ))
            )}
          </div>

          {shownTips.length > 0 && (
            <>
              <h2 className={[styles.desktopSectionTitle, styles.desktopSidebarSection].join(' ')}>
                💡 Tips de ahorro
              </h2>
              <div className={styles.desktopCard}>
                {shownTips.map((tip, i) => (
                  <div key={i} className={styles.desktopTipRow}>
                    <span className={styles.desktopTipIcon}>{tip.icon}</span>
                    <p className={styles.desktopTipText}>{tip.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {categoryGrowth.length > 0 && (
            <>
              <h2 className={[styles.desktopSectionTitle, styles.desktopSidebarSection].join(' ')}>
                Categorías destacadas
              </h2>
              <div className={styles.desktopCard}>
                {categoryGrowth.map((cat) => (
                  <div key={cat.categoryId} className={styles.desktopCatRow}>
                    <span className={styles.desktopCatIcon}>{cat.categoryIcon}</span>
                    <span className={styles.desktopCatName}>{cat.categoryName}</span>
                    <span
                      className={[
                        styles.desktopCatDelta,
                        cat.delta > 0 ? styles.catDeltaUp : styles.catDeltaDown,
                      ].join(' ')}
                    >
                      {cat.delta > 0 ? '↑' : '↓'}
                      {Math.abs(cat.delta)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
}
