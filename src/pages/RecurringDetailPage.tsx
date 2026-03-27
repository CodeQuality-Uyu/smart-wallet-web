// src/pages/RecurringDetailPage.tsx

import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import type { FormikHelpers } from 'formik'
import {
  useRecurring,
  useUpdateRecurring,
  useToggleRecurringStatus,
  useConfirmRecurringPayment,
} from '@/features/recurring/hooks/useRecurring'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { recurringSchema, type RecurringFormValues } from '@/features/recurring/schemas/recurringSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { confirmPaymentSchema, type ConfirmPaymentFormValues } from '@/features/recurring/schemas/confirmPaymentSchema'
import { formatCurrency } from '@/utils/formatCurrency'
import { RecurringMode, RecurringFrequency, RecurringStatus, RecurringPaymentStatus, Currency, CardType } from '@/types/enums'
import styles from './RecurringDetailPage.module.css'

const ICON_OPTIONS = ['📺', '🎵', '☁️', '💡', '🌊', '📱', '🎮', '🏠', '💊', '🔒', '📰', '🚗']

const CURRENCY_OPTIONS = [
  { value: Currency.UYU, label: 'UYU' },
  { value: Currency.USD, label: 'USD' },
]

export default function RecurringDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: rec, isLoading, error } = useRecurring(id ?? '')
  const { mutateAsync: updateRecurring } = useUpdateRecurring(id ?? '')
  const { mutateAsync: toggleStatus } = useToggleRecurringStatus(id ?? '')
  const { mutateAsync: confirmPayment } = useConfirmRecurringPayment(id ?? '')
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const [isEditing, setIsEditing] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const receiptFileInputRef = useRef<HTMLInputElement>(null)

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !rec) return <ErrorMessage message="No se pudo cargar el recurrente." />

  const isPaused = rec.status === RecurringStatus.Paused
  const isPending = rec.currentMonthStatus === RecurringPaymentStatus.Pending
  const isManual = rec.mode === RecurringMode.Manual
  const category = categories.find((c) => c.id === rec.categoryId)
  const card = cards.find((c) => c.id === rec.cardId)
  const freqLabel = rec.frequency === RecurringFrequency.Annual ? 'año' : 'mes'

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: `${c.bank} · ${c.type === CardType.Credit ? 'Crédito' : c.type === CardType.Debit ? 'Débito' : 'Transferencia'} ···· ${c.lastFour ?? '----'}`,
  }))

  async function handleToggle(): Promise<void> {
    await toggleStatus(isPaused ? RecurringStatus.Active : RecurringStatus.Paused)
  }

  async function handleConfirmPayment(values: ConfirmPaymentFormValues): Promise<void> {
    await confirmPayment({ amount: values.amount, receiptFile: values.receiptFile ?? undefined })
    setShowPaymentForm(false)
  }

  async function handleUpdate(
    values: RecurringFormValues,
    { setStatus }: FormikHelpers<RecurringFormValues>,
  ): Promise<void> {
    try {
      await updateRecurring({
        name: values.name,
        icon: values.icon,
        description: values.description || undefined,
        amount: values.amount,
        currency: values.currency,
        categoryId: values.categoryId,
        cardId: values.cardId,
        mode: values.mode,
        frequency: values.frequency,
        dueDayOfMonth: values.mode === RecurringMode.Manual ? values.dueDayOfMonth : undefined,
      })
      setIsEditing(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  // ─── Edit form ────────────────────────────────────────────
  if (isEditing) {
    return (
      <div>
        <div className={styles.editHeader}>
          <button className={styles.back} onClick={() => setIsEditing(false)}>←</button>
          <span className={styles.editTitle}>Editar recurrente</span>
        </div>

        <div className={styles.editBody}>
          <Formik<RecurringFormValues>
            initialValues={{
              name: rec.name,
              icon: rec.icon,
              description: rec.description ?? '',
              amount: rec.amount,
              currency: rec.currency,
              categoryId: rec.categoryId,
              cardId: rec.cardId,
              mode: rec.mode,
              frequency: rec.frequency ?? RecurringFrequency.Monthly,
              status: rec.status,
              dueDayOfMonth: rec.dueDayOfMonth,
            }}
            validationSchema={recurringSchema}
            onSubmit={handleUpdate}
          >
            {({ isSubmitting, values, setFieldValue, status }) => (
              <Form noValidate>
                <FormField name="name" label="Nombre">
                  <TextInput name="name" placeholder="ej. Netflix" />
                </FormField>

                <FormField name="icon" label="Ícono">
                  <div className={styles.iconPicker}>
                    {ICON_OPTIONS.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        className={[styles.icoBtn, values.icon === ico ? styles.icoBtnActive : ''].join(' ')}
                        onClick={() => void setFieldValue('icon', ico)}
                        aria-pressed={values.icon === ico}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField name="description" label="Descripción (opcional)">
                  <TextInput name="description" placeholder="ej. Plan familiar" maxLength={100} />
                </FormField>

                <div className={styles.formRow}>
                  <div style={{ flex: 1 }}>
                    <FormField name="amount" label="Monto">
                      <TextInput name="amount" type="number" min="0" step="any" placeholder="0" />
                    </FormField>
                  </div>
                  <div style={{ width: 100 }}>
                    <FormField name="currency" label="Moneda">
                      <SelectInput name="currency" options={CURRENCY_OPTIONS} />
                    </FormField>
                  </div>
                </div>

                <FormField name="categoryId" label="Categoría">
                  <CategoryChips
                    categories={categories}
                    selected={values.categoryId ? [values.categoryId] : []}
                    onChange={(ids) => {
                      const newId = ids.find((id) => id !== values.categoryId) ?? ''
                      void setFieldValue('categoryId', newId)
                    }}
                  />
                  <p className={styles.createHint}>
                    ¿No encontrás la categoría?{' '}
                    <a href="/settings/categories" className={styles.createLink}>Crear nueva →</a>
                  </p>
                </FormField>

                <FormField name="cardId" label="Medio de pago">
                  <SelectInput name="cardId" options={cardOptions} />
                </FormField>

                <FormField name="mode" label="Modo de pago">
                  <div className={styles.modeSelector}>
                    {([RecurringMode.Auto, RecurringMode.Manual] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={[styles.modeOpt, values.mode === m ? styles.modeOptActive : ''].join(' ')}
                        onClick={() => void setFieldValue('mode', m)}
                      >
                        {m === RecurringMode.Auto ? '⚡ Automático' : '✋ Manual'}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField name="frequency" label="Frecuencia">
                  <div className={styles.modeSelector}>
                    {([RecurringFrequency.Monthly, RecurringFrequency.Annual] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={[styles.modeOpt, values.frequency === f ? styles.modeOptActive : ''].join(' ')}
                        onClick={() => void setFieldValue('frequency', f)}
                      >
                        {f === RecurringFrequency.Monthly ? '📅 Mensual' : '📆 Anual'}
                      </button>
                    ))}
                  </div>
                </FormField>

                {values.mode === RecurringMode.Manual && (
                  <FormField name="dueDayOfMonth" label="Día de vencimiento">
                    <TextInput name="dueDayOfMonth" type="number" min="1" max="31" placeholder="ej. 15" />
                  </FormField>
                )}

                {status && <p className={styles.formError}>{status}</p>}

                <div className={styles.formActions}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                    Guardar cambios
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    )
  }

  // ─── Detail view ─────────────────────────────────────────
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)}>←</button>
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>✏️ Editar</button>
        </div>
        <div className={styles.icon}>{rec.icon}</div>
        <h1 className={styles.name}>{rec.name}</h1>
        {rec.description && <p className={styles.description}>{rec.description}</p>}
        <p className={styles.amount}>
          {formatCurrency(rec.amount, rec.currency)}{' '}
          <span className={styles.currency}>{rec.currency}/{freqLabel}</span>
        </p>
        <div className={styles.badges}>
          <span className={[styles.modeBadge, isManual ? styles.manual : styles.auto].join(' ')}>
            {isManual ? 'Manual' : 'Auto'}
          </span>
          <span className={styles.payBadge}>
            {rec.frequency === RecurringFrequency.Annual ? '📆 Anual' : '📅 Mensual'}
          </span>
        </div>
      </header>

      {isPending && isManual && (
        <div className={styles.pendingAlert}>
          <span>⚠️</span>
          <div>
            <p className={styles.pendingTitle}>Pago pendiente</p>
            <p className={styles.pendingSub}>Vence el {rec.dueDayOfMonth} de este mes</p>
          </div>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.lbl}>📂 Categoría</span>
          <span className={styles.val}>{category ? `${category.icon} ${category.name}` : '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.lbl}>💳 Tarjeta</span>
          <span className={styles.val}>
            {card ? `${card.bank} ···· ${card.lastFour ?? '—'}` : '—'}
          </span>
        </div>
        {isManual && (
          <div className={styles.row}>
            <span className={styles.lbl}>📅 Vencimiento</span>
            <span className={styles.val}>Día {rec.dueDayOfMonth} de cada mes</span>
          </div>
        )}
        <div className={styles.row}><span className={styles.lbl}>💱 Moneda</span><span className={styles.val}>{rec.currency}</span></div>
        <div className={styles.row}>
          <span className={styles.lbl}>📊 Estado</span>
          <span className={[styles.val, isPaused ? styles.pausedText : styles.activeText].join(' ')}>
            {isPaused ? 'Pausado' : 'Activo'}
          </span>
        </div>
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <h2 className={styles.historyTitle}>Historial</h2>
          {isManual && (
            <button
              className={styles.addPaymentBtn}
              onClick={() => setShowPaymentForm((v) => !v)}
              disabled={!isPending}
              title={isPending ? 'Registrar pago del mes' : 'El mes ya está pagado'}
            >
              {isPending ? '+ Registrar pago' : '✓ Pagado'}
            </button>
          )}
        </div>

        {isManual && showPaymentForm && (
          <div className={styles.inlineForm}>
            <Formik<ConfirmPaymentFormValues>
              initialValues={{ amount: rec.amount, receiptFile: undefined }}
              validationSchema={confirmPaymentSchema}
              onSubmit={handleConfirmPayment}
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
                    className={styles.uploadArea}
                    onClick={() => receiptFileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && receiptFileInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                  >
                    {values.receiptFile ? (
                      <p>📄 {values.receiptFile.name}</p>
                    ) : (
                      <p>📄 Subir factura <span style={{ color: 'var(--muted)' }}>(opcional)</span></p>
                    )}
                  </div>
                  {touched.receiptFile && errors.receiptFile && (
                    <p className={styles.fieldError}>{errors.receiptFile as string}</p>
                  )}

                  <div className={styles.inlineFormActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowPaymentForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Confirmar pago
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

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

      <div style={{ padding: '0 20px 32px' }}>
        <Button variant="ghost" fullWidth onClick={() => void handleToggle()}>
          {isPaused ? '▶ Activar servicio' : '⏸ Pausar servicio'}
        </Button>
      </div>
    </div>
  )
}
