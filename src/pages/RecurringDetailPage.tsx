// src/pages/RecurringDetailPage.tsx

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { useRecurring, useToggleRecurringStatus, useConfirmRecurringPayment } from '@/features/recurring/hooks/useRecurring'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { confirmPaymentSchema, type ConfirmPaymentFormValues } from '@/features/recurring/schemas/confirmPaymentSchema'
import { formatCurrency } from '@/utils/formatCurrency'
import { RecurringMode, RecurringStatus, RecurringPaymentStatus } from '@/types/enums'
import styles from './RecurringDetailPage.module.css'

export default function RecurringDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: rec, isLoading, error } = useRecurring(id ?? '')
  const { mutateAsync: toggleStatus } = useToggleRecurringStatus(id ?? '')
  const { mutateAsync: confirmPayment } = useConfirmRecurringPayment(id ?? '')

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !rec) return <ErrorMessage message="No se pudo cargar el recurrente." />

  const isPaused = rec.status === RecurringStatus.Paused
  const isPending = rec.currentMonthStatus === RecurringPaymentStatus.Pending
  const isManual = rec.mode === RecurringMode.Manual

  async function handleToggle(): Promise<void> {
    await toggleStatus(isPaused ? RecurringStatus.Active : RecurringStatus.Paused)
  }

  async function handleConfirmPayment(values: ConfirmPaymentFormValues): Promise<void> {
    await confirmPayment({ amount: values.amount })
    navigate(-1)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
          <span className={styles.editBtn}>✏️ Editar</span>
        </div>
        <div className={styles.icon}>{rec.icon}</div>
        <h1 className={styles.name}>{rec.name}</h1>
        <p className={styles.amount}>
          {formatCurrency(rec.amount, rec.currency)}{' '}
          <span className={styles.currency}>{rec.currency}/mes</span>
        </p>
        <div className={styles.badges}>
          <span className={[styles.modeBadge, isManual ? styles.manual : styles.auto].join(' ')}>
            {isManual ? 'Manual' : 'Auto'}
          </span>
          {!isManual && <span className={styles.payBadge}>Pago automático</span>}
        </div>
      </header>

      {/* Pending alert */}
      {isPending && isManual && (
        <div className={styles.pendingAlert}>
          <span>⚠️</span>
          <div>
            <p className={styles.pendingTitle}>Pago pendiente</p>
            <p className={styles.pendingSub}>Vence el {rec.dueDayOfMonth} de este mes</p>
          </div>
        </div>
      )}

      {/* Detail rows */}
      <div className={styles.body}>
        <div className={styles.row}><span className={styles.lbl}>📂 Categoría</span><span className={styles.val}>Servicios</span></div>
        {isManual && <div className={styles.row}><span className={styles.lbl}>📅 Vencimiento</span><span className={styles.val}>Día {rec.dueDayOfMonth} de cada mes</span></div>}
        <div className={styles.row}><span className={styles.lbl}>💱 Moneda</span><span className={styles.val}>{rec.currency}</span></div>
        <div className={styles.row}>
          <span className={styles.lbl}>📊 Estado</span>
          <span className={[styles.val, isPaused ? styles.pausedText : styles.activeText].join(' ')}>
            {isPaused ? 'Pausado' : 'Activo'}
          </span>
        </div>
      </div>

      {/* Confirm payment (manual + pending) */}
      {isManual && isPending && (
        <div className={styles.confirmSection}>
          <h2 className={styles.confirmTitle}>Registrar pago</h2>
          <Formik<ConfirmPaymentFormValues>
            initialValues={{ amount: rec.amount }}
            validationSchema={confirmPaymentSchema}
            onSubmit={handleConfirmPayment}
          >
            {({ isSubmitting }) => (
              <Form>
                <FormField name="amount" label="Monto de esta factura">
                  <TextInput name="amount" type="number" inputMode="decimal" icon="$" />
                </FormField>
                <div className={styles.uploadArea}>
                  <p>📄 Subir factura (confirma el pago)</p>
                </div>
                <Button type="submit" variant="secondary" fullWidth loading={isSubmitting}>
                  Confirmar pago
                </Button>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Payment history */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Historial</h2>
        {rec.paymentHistory.map((h) => (
          <div key={h.id} className={styles.histRow}>
            <span className={styles.histDate}>{h.month}/{h.year}</span>
            <span className={styles.histAmt}>{formatCurrency(h.amount, h.currency)}</span>
            <span className={styles.histCheck}>✓</span>
          </div>
        ))}
        {rec.paymentHistory.length === 0 && (
          <p className={styles.emptyHistory}>Sin historial de pagos.</p>
        )}
      </div>

      {/* Toggle */}
      <div style={{ padding: '0 20px 32px' }}>
        <Button variant="ghost" fullWidth onClick={() => void handleToggle()}>
          {isPaused ? '▶ Activar servicio' : '⏸ Pausar servicio'}
        </Button>
      </div>
    </div>
  )
}
