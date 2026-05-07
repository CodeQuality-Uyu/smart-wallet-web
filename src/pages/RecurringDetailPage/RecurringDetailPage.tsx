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
  useUpdateRecurringPayment,
  useUploadRecurringPaymentReceipt,
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
  const { mutateAsync: uploadReceipt, isPending: isUploadingReceipt } = useUploadRecurringPaymentReceipt(id ?? '')
  const { mutateAsync: updatePayment } = useUpdateRecurringPayment(id ?? '')
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const [isEditing, setIsEditing] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [overdueFormKey, setOverdueFormKey] = useState<string | null>(null)
  const receiptFileInputRef = useRef<HTMLInputElement>(null)
  const overdueReceiptRef = useRef<HTMLInputElement>(null)

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !rec) return <ErrorMessage message="No se pudo cargar el recurrente." />

  const isPaused = rec.status === RecurringStatus.Paused
  const isPending = rec.currentMonthStatus === RecurringPaymentStatus.Pending
  const isManual = rec.mode === RecurringMode.Manual
  const categoryLabels = rec.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => `${c!.icon ?? ''} ${c!.name}`.trim())
    .join(', ')
  const card = cards.find((c) => c.id === rec.cardId)
  const freqLabel = rec.frequency === RecurringFrequency.Annual ? 'año' : 'mes'

  // ── Overdue months (last 3, not yet paid) ─────────────────
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const overdueMonths: Array<{ month: number; year: number; label: string }> = (() => {
    if (!isManual || rec.frequency !== RecurringFrequency.Monthly) return []
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const result: Array<{ month: number; year: number; label: string }> = []
    for (let i = 1; i <= 3; i++) {
      let m = currentMonth - i
      let y = currentYear
      if (m <= 0) { m += 12; y -= 1 }
      const createdDate = new Date(rec.createdAt)
      const checkEnd = new Date(y, m, 0)
      if (checkEnd < createdDate) break
      const wasPaid = rec.paymentHistory.some(
        (h) => h.month === m && h.year === y && h.status === RecurringPaymentStatus.Paid
      )
      if (!wasPaid) {
        const label = y === currentYear ? (MONTH_NAMES[m - 1] ?? '') : `${MONTH_NAMES[m - 1] ?? ''} ${y}`
        result.push({ month: m, year: y, label })
      }
    }
    return result
  })()

  async function handleConfirmOverduePayment(values: ConfirmPaymentFormValues, month: number, year: number): Promise<void> {
    await confirmPayment({ amount: values.amount, receiptFile: values.receiptFile ?? undefined, month, year })
    setOverdueFormKey(null)
  }

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
        categoryIds: values.categoryIds as string[],
        cardId: values.cardId,
        mode: values.mode,
        frequency: values.frequency,
        dueDayOfMonth: values.dueDayOfMonth,
      })
      setIsEditing(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  // ─── Shared edit form content ──────────────────────────────
  const editFormContent = (
    <Formik<RecurringFormValues>
      initialValues={{
        name: rec.name,
        icon: rec.icon,
        description: rec.description ?? '',
        amount: rec.amount,
        currency: rec.currency,
        categoryIds: rec.categoryIds,
        cardId: rec.cardId,
        mode: rec.mode,
        frequency: rec.frequency ?? RecurringFrequency.Monthly,
        status: rec.status,
        dueDayOfMonth: rec.dueDayOfMonth ?? ('' as unknown as number),
      }}
      validationSchema={recurringSchema}
      onSubmit={handleUpdate}
    >
      {({ isSubmitting, values, setFieldValue, status }) => (
        <Form noValidate>
          {/* Mobile form layout */}
          <div className={styles.mobileFormFields}>
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

            <FormField name="categoryIds" label="Categorías">
              <CategoryChips
                categories={categories}
                selected={values.categoryIds as string[]}
                onChange={(ids) => void setFieldValue('categoryIds', ids)}
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

            <FormField name="dueDayOfMonth" label="Día de vencimiento">
              <TextInput name="dueDayOfMonth" type="number" min="1" max="31" placeholder="ej. 15" />
            </FormField>
          </div>

          {/* Desktop form layout */}
          <div className={styles.desktopFormFields}>
            <div className={styles.dkFormGrid}>
              <FormField name="name" label="Nombre del servicio">
                <TextInput name="name" placeholder="Ej: Netflix, Internet..." />
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
              <div className={styles.dkFormSpan2}>
                <FormField name="description" label="Descripción (opcional)">
                  <TextInput name="description" placeholder="ej. Plan familiar" maxLength={100} />
                </FormField>
              </div>
              <FormField name="amount" label="Monto">
                <TextInput name="amount" type="number" min="0" step="any" placeholder="0.00" />
              </FormField>
              <FormField name="currency" label="Moneda">
                <SelectInput name="currency" options={CURRENCY_OPTIONS} />
              </FormField>
              <FormField name="frequency" label="Frecuencia">
                <div className={styles.dkToggle}>
                  {([RecurringFrequency.Monthly, RecurringFrequency.Annual] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={[styles.dkToggleOpt, values.frequency === f ? styles.dkToggleOptActive : ''].join(' ')}
                      onClick={() => void setFieldValue('frequency', f)}
                    >
                      {f === RecurringFrequency.Monthly ? '📅 Mensual' : '📆 Anual'}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField name="mode" label="Naturaleza">
                <div className={styles.dkToggle}>
                  {([RecurringMode.Auto, RecurringMode.Manual] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={[styles.dkToggleOpt, values.mode === m ? styles.dkToggleOptActive : ''].join(' ')}
                      onClick={() => void setFieldValue('mode', m)}
                    >
                      {m === RecurringMode.Auto ? '⚡ Automático' : '✋ Manual'}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField name="categoryIds" label="Categorías">
                <CategoryChips
                  categories={categories}
                  selected={values.categoryIds as string[]}
                  onChange={(ids) => void setFieldValue('categoryIds', ids)}
                  maxVisible={6}
                />
              </FormField>
              <FormField name="cardId" label="Método de pago">
                <SelectInput name="cardId" options={cardOptions} />
              </FormField>
              <FormField name="dueDayOfMonth" label="Día de vencimiento">
                <TextInput name="dueDayOfMonth" type="number" min="1" max="31" placeholder="15" />
              </FormField>
            </div>
          </div>

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
  )

  // ─── Confirm payment form ──────────────────────────────────
  const paymentFormContent = (
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
  )

  function formatPaidAt(paidAt?: string, month?: number, year?: number): string {
    if (paidAt) {
      return new Date(paidAt).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    if (month && year) {
      const d = new Date(year, month - 1, 1)
      return d.toLocaleDateString('es-UY', { month: 'short', year: 'numeric' })
    }
    return '—'
  }

  async function handleUpdatePayment(paymentId: string, amount: number, paidAt?: string): Promise<void> {
    await updatePayment({ paymentId, payload: { amount, paidAt } })
    setEditingPaymentId(null)
  }

  async function handleReceiptUpload(paymentId: string, file: File): Promise<void> {
    setUploadingPaymentId(paymentId)
    try {
      await uploadReceipt({ paymentId, file })
    } finally {
      setUploadingPaymentId(null)
    }
  }

  // ─── Overdue month form builder ────────────────────────────
  function overduePaymentForm(month: number, year: number): React.ReactElement {
    return (
      <div className={styles.inlineForm}>
        <Formik<ConfirmPaymentFormValues>
          initialValues={{ amount: rec!.amount, receiptFile: undefined }}
          validationSchema={confirmPaymentSchema}
          onSubmit={(v) => handleConfirmOverduePayment(v, month, year)}
        >
          {({ isSubmitting, setFieldValue, values, errors, touched }) => (
            <Form>
              <FormField name="amount" label="Monto de esta factura">
                <TextInput name="amount" type="number" inputMode="decimal" icon="$" />
              </FormField>
              <input
                ref={overdueReceiptRef}
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
                onClick={() => overdueReceiptRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && overdueReceiptRef.current?.click()}
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setOverdueFormKey(null)}>
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
    )
  }

  // ─── History rows ──────────────────────────────────────────
  const sortedHistory = [...rec.paymentHistory].sort((a, b) => {
    const da = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.year, a.month - 1).getTime()
    const db = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.year, b.month - 1).getTime()
    return db - da
  })

  const historyContent = (
    <>
      {sortedHistory.map((h) => (
        <div key={h.id} className={styles.histEntry}>
          {editingPaymentId === h.id ? (
            <Formik
              initialValues={{ amount: h.amount }}
              onSubmit={async (v, { setSubmitting }) => {
                await handleUpdatePayment(h.id, v.amount)
                setSubmitting(false)
              }}
            >
              {({ isSubmitting }) => (
                <Form className={styles.histEditForm}>
                  <span className={styles.histEditLabel}>{formatPaidAt(h.paidAt, h.month, h.year)}</span>
                  <TextInput name="amount" type="number" inputMode="decimal" />
                  <div className={styles.histEditActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingPaymentId(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Guardar
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : (
            <div className={styles.histRow}>
              <span className={styles.histCheck}>✓</span>
              <div className={styles.histInfo}>
                <span className={styles.histDate}>{formatPaidAt(h.paidAt, h.month, h.year)}</span>
                <span className={styles.histAmt}>{formatCurrency(h.amount, h.currency)}</span>
              </div>
              <div className={styles.histReceipt}>
                {h.receiptUrl ? (
                  <a
                    href={h.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.histReceiptLink}
                  >
                    📄 Comprobante
                  </a>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'none' }}
                      id={`receipt-upload-${h.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleReceiptUpload(h.id, file)
                        e.target.value = ''
                      }}
                    />
                    <label
                      htmlFor={`receipt-upload-${h.id}`}
                      className={styles.histUploadBtn}
                      aria-disabled={uploadingPaymentId === h.id || isUploadingReceipt}
                    >
                      {uploadingPaymentId === h.id ? '⏳' : '+ Comprobante'}
                    </label>
                  </>
                )}
              </div>
              <button
                className={styles.histEditBtn}
                onClick={() => setEditingPaymentId(h.id)}
                title="Editar pago"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      ))}
      {rec.paymentHistory.length === 0 && (
        <p className={styles.emptyHistory}>Sin historial de pagos.</p>
      )}
    </>
  )

  // ─── Edit form ────────────────────────────────────────────
  if (isEditing) {
    return (
      <div>
        {/* Mobile edit */}
        <div className={styles.mobileOnly}>
          <div className={styles.editHeader}>
            <button className={styles.back} onClick={() => setIsEditing(false)}>←</button>
            <span className={styles.editTitle}>Editar recurrente</span>
          </div>
          <div className={styles.editBody}>
            {editFormContent}
          </div>
        </div>

        {/* Desktop edit */}
        <div className={styles.desktopOnly}>
          <div className={styles.dkEditWrap}>
            <div className={styles.dkBreadcrumb}>
              <button className={styles.dkBackBtn} onClick={() => setIsEditing(false)}>← Volver</button>
            </div>
            <div className={styles.dkEditCard}>
              <h2 className={styles.dkEditCardTitle}>✏️ Editar pago recurrente</h2>
              {editFormContent}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Detail view ─────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Mobile detail ── */}
      <div className={styles.mobileOnly}>
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
            <span className={styles.val}>{categoryLabels || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>💳 Tarjeta</span>
            <span className={styles.val}>
              {card ? `${card.bank} ···· ${card.lastFour ?? '—'}` : '—'}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>📅 Vencimiento</span>
            <span className={styles.val}>{rec.dueDayOfMonth ? `Día ${rec.dueDayOfMonth} de cada mes` : '—'}</span>
          </div>
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
          {isManual && showPaymentForm && paymentFormContent}
          {overdueMonths.length > 0 && (
            <div className={styles.overdueSection}>
              <p className={styles.overdueSectionTitle}>⚠️ Sin registrar — meses anteriores</p>
              {overdueMonths.map(({ month, year, label }) => {
                const key = `${year}-${month}`
                return (
                  <div key={key} className={styles.overdueMonthRow}>
                    <span className={styles.overdueMonthLabel}>{label}</span>
                    {overdueFormKey === key ? (
                      overduePaymentForm(month, year)
                    ) : (
                      <button
                        className={styles.overdueRegisterBtn}
                        onClick={() => setOverdueFormKey(key)}
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {historyContent}
        </div>

        <div style={{ padding: '0 20px 32px' }}>
          <Button variant="ghost" fullWidth onClick={() => void handleToggle()}>
            {isPaused ? '▶ Activar servicio' : '⏸ Pausar servicio'}
          </Button>
        </div>
      </div>

      {/* ── Desktop detail ── */}
      <div className={styles.desktopOnly}>
        <div className={styles.dkWrap}>
          {/* Top bar */}
          <div className={styles.dkTopBar}>
            <div className={styles.dkTopLeft}>
              <h1 className={styles.dkPageTitle}>{rec.icon} {rec.name}</h1>
              {rec.description && <p className={styles.dkPageDesc}>{rec.description}</p>}
              <div className={styles.dkHeroBadges}>
                <span className={[styles.dkBadge, isManual ? styles.dkBadgeManual : styles.dkBadgeAuto].join(' ')}>
                  {isManual ? '✋ Manual' : '⚡ Automático'}
                </span>
                <span className={[styles.dkBadgeStatus, isPaused ? styles.dkBadgePaused : styles.dkBadgeActive].join(' ')}>
                  {isPaused ? 'Pausado' : 'Activo'}
                </span>
              </div>
            </div>
            <div className={styles.dkTopRight}>
              <div className={styles.dkHeroAmount}>
                <span className={styles.dkAmtNumber}>{formatCurrency(rec.amount, rec.currency)}</span>
                <span className={styles.dkAmtPeriod}>/{freqLabel}</span>
              </div>
              <button className={styles.dkEditTopBtn} onClick={() => setIsEditing(true)}>
                Editar
              </button>
            </div>
          </div>

          {/* Pending alert */}
          {isPending && isManual && (
            <div className={styles.dkPendingAlert}>
              <span className={styles.dkPendingIcon}>⚠️</span>
              <div>
                <p className={styles.dkPendingTitle}>Pago pendiente este mes</p>
                <p className={styles.dkPendingSub}>Vence el día {rec.dueDayOfMonth}</p>
              </div>
              {!showPaymentForm && (
                <button className={styles.dkPendingAction} onClick={() => setShowPaymentForm(true)}>
                  Registrar pago →
                </button>
              )}
            </div>
          )}

          {/* Main info card */}
          <div className={styles.dkMainCard}>
            <div className={styles.dkInfoList}>
              <div className={styles.dkInfoItem}>
                <span className={styles.dkInfoLabel}>Categoría</span>
                <span className={styles.dkInfoValue}>{categoryLabels || '—'}</span>
              </div>
              <div className={styles.dkInfoItem}>
                <span className={styles.dkInfoLabel}>Método de pago</span>
                <span className={styles.dkInfoValue}>
                  {card ? `${card.bank} ···· ${card.lastFour ?? '—'}` : '—'}
                </span>
              </div>
              <div className={styles.dkInfoItem}>
                <span className={styles.dkInfoLabel}>Día de vencimiento</span>
                <span className={styles.dkInfoValue}>Día {rec.dueDayOfMonth} de cada mes</span>
              </div>
            </div>
          </div>

          {/* History card */}
          <div className={styles.dkHistoryCard}>
            <div className={styles.dkHistHeader}>
              <h3 className={styles.dkHistTitle}>Historial de pagos</h3>
              {isManual && (
                <button
                  className={styles.dkConfirmBtn}
                  onClick={() => setShowPaymentForm((v) => !v)}
                  disabled={!isPending}
                >
                  {isPending ? '+ Registrar pago' : '✓ Al día'}
                </button>
              )}
            </div>

            {isManual && showPaymentForm && paymentFormContent}

            {overdueMonths.length > 0 && (
              <div className={styles.overdueSection}>
                <p className={styles.overdueSectionTitle}>⚠️ Sin registrar — meses anteriores</p>
                {overdueMonths.map(({ month, year, label }) => {
                  const key = `${year}-${month}`
                  return (
                    <div key={key} className={styles.overdueMonthEntry}>
                      <div className={styles.overdueMonthRow}>
                        <span className={styles.overdueMonthLabel}>{label}</span>
                        {overdueFormKey !== key && (
                          <button
                            className={styles.overdueRegisterBtn}
                            onClick={() => setOverdueFormKey(key)}
                          >
                            Registrar pago
                          </button>
                        )}
                      </div>
                      {overdueFormKey === key && overduePaymentForm(month, year)}
                    </div>
                  )
                })}
              </div>
            )}

            <div className={styles.dkHistList}>
              {sortedHistory.length === 0 ? (
                <p className={styles.dkHistEmpty}>Sin historial de pagos aún.</p>
              ) : (
                sortedHistory.map((h) => (
                  <div key={h.id} className={styles.histEntry}>
                    {editingPaymentId === h.id ? (
                      <Formik
                        initialValues={{ amount: h.amount }}
                        onSubmit={async (v, { setSubmitting }) => {
                          await handleUpdatePayment(h.id, v.amount)
                          setSubmitting(false)
                        }}
                      >
                        {({ isSubmitting }) => (
                          <Form className={styles.histEditForm}>
                            <span className={styles.histEditLabel}>{formatPaidAt(h.paidAt, h.month, h.year)}</span>
                            <TextInput name="amount" type="number" inputMode="decimal" />
                            <div className={styles.histEditActions}>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingPaymentId(null)}>
                                Cancelar
                              </Button>
                              <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                                Guardar
                              </Button>
                            </div>
                          </Form>
                        )}
                      </Formik>
                    ) : (
                      <div className={styles.dkHistRow}>
                        <span className={styles.dkHistCheck}>✓</span>
                        <div className={styles.dkHistInfo}>
                          <span className={styles.dkHistDate}>{formatPaidAt(h.paidAt, h.month, h.year)}</span>
                          <span className={styles.dkHistAmt}>{formatCurrency(h.amount, h.currency)}</span>
                        </div>
                        <div className={styles.dkHistReceiptCol}>
                          {h.receiptUrl ? (
                            <a
                              href={h.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.dkHistReceiptLink}
                            >
                              📄 Comprobante
                            </a>
                          ) : (
                            <>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                style={{ display: 'none' }}
                                id={`dk-receipt-${h.id}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) void handleReceiptUpload(h.id, file)
                                  e.target.value = ''
                                }}
                              />
                              <label
                                htmlFor={`dk-receipt-${h.id}`}
                                className={styles.dkHistUploadBtn}
                                aria-disabled={uploadingPaymentId === h.id || isUploadingReceipt}
                              >
                                {uploadingPaymentId === h.id ? '⏳' : '+ Comprobante'}
                              </label>
                            </>
                          )}
                        </div>
                        <button
                          className={styles.histEditBtn}
                          onClick={() => setEditingPaymentId(h.id)}
                          title="Editar pago"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pause / activate — full width */}
          <button
            className={[styles.dkPauseBtn, isPaused ? styles.dkPauseBtnActivate : ''].join(' ')}
            onClick={() => void handleToggle()}
          >
            {isPaused ? '▶ Activar servicio' : '⏸ Pausar servicio'}
          </button>
        </div>
      </div>
    </div>
  )
}
