// src/pages/RecurringPage.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import type { FormikHelpers } from 'formik'
import { useRecurringList, useCreateRecurring } from '@/features/recurring/hooks/useRecurring'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { recurringSchema, type RecurringFormValues } from '@/features/recurring/schemas/recurringSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatCurrency } from '@/utils/formatCurrency'
import { RecurringMode, RecurringFrequency, RecurringPaymentStatus, RecurringStatus, Currency, CardType } from '@/types/enums'
import styles from './RecurringPage.module.css'

const ICON_OPTIONS = ['📺', '🎵', '☁️', '💡', '🌊', '📱', '🎮', '🏠', '💊', '🔒', '📰', '🚗']

const CURRENCY_OPTIONS = [
  { value: Currency.UYU, label: 'UYU' },
  { value: Currency.USD, label: 'USD' },
]

export default function RecurringPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: recurring = [], isLoading, error, refetch } = useRecurringList()
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { mutateAsync: createRecurring } = useCreateRecurring()
  const [showForm, setShowForm] = useState(false)

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: `${c.bank} · ${c.type === CardType.Credit ? 'Crédito' : c.type === CardType.Debit ? 'Débito' : 'Transferencia'} ···· ${c.lastFour ?? '----'}`,
  }))

  // Group recurring items by categoryId
  const grouped = recurring.reduce<Record<string, typeof recurring>>((acc, item) => {
    ;(acc[item.categoryId] ??= []).push(item)
    return acc
  }, {})

  if (isLoading) return <LoadingSpinner fullPage />
  if (error) return <ErrorMessage onRetry={() => void refetch()} />

  async function handleSubmit(
    values: RecurringFormValues,
    { setStatus }: FormikHelpers<RecurringFormValues>,
  ): Promise<void> {
    try {
      await createRecurring({
        name: values.name,
        icon: values.icon,
        description: values.description || undefined,
        amount: values.amount,
        currency: values.currency,
        categoryId: values.categoryId,
        cardId: values.cardId,
        mode: values.mode,
        frequency: values.frequency,
        status: RecurringStatus.Active,
        dueDayOfMonth: values.mode === RecurringMode.Manual ? values.dueDayOfMonth : undefined,
      })
      setShowForm(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  const renderItem = (item: (typeof recurring)[0]): React.ReactElement => {
    const isPending = item.currentMonthStatus === RecurringPaymentStatus.Pending
    return (
      <article
        key={item.id}
        className={[styles.item, isPending ? styles.itemPending : ''].join(' ')}
        onClick={() => navigate(`/settings/recurring/${item.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/settings/recurring/${item.id}`)}
      >
        <div className={styles.itemIcon}>{item.icon}</div>
        <div className={styles.itemInfo}>
          <div className={styles.itemTop}>
            <span className={styles.itemName}>{item.name}</span>
            <span className={[styles.modeBadge, item.mode === RecurringMode.Auto ? styles.auto : styles.manual].join(' ')}>
              {item.mode === RecurringMode.Auto ? 'Auto' : 'Manual'}
            </span>
            {item.status === 'paused' && (
              <span className={styles.pausedBadge}>Pausado</span>
            )}
          </div>
          <div className={styles.itemSub}>
            {item.mode === RecurringMode.Manual && item.currentMonthStatus && (
              <span className={[
                styles.paymentState,
                item.currentMonthStatus === RecurringPaymentStatus.Paid ? styles.paid : styles.pending
              ].join(' ')}>
                {item.currentMonthStatus === RecurringPaymentStatus.Paid
                  ? '✓ Pagado'
                  : `⚠ Vence día ${item.dueDayOfMonth}`}
              </span>
            )}
          </div>
        </div>
        <div className={styles.itemRight}>
          <p className={styles.itemAmt}>
            {formatCurrency(item.amount, item.currency)}{' '}
            <span className={styles.itemCurr}>
              {item.currency}/{item.frequency === RecurringFrequency.Annual ? 'año' : 'mes'}
            </span>
          </p>
        </div>
      </article>
    )
  }

  return (
    <div>
      <PageHeader title="Recurrentes" subtitle="Se registran automáticamente cada mes" showBack />

      <div style={{ padding: '12px 20px' }}>
        <button className={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          ＋ Agregar recurrente
        </button>

        {showForm && (
          <Formik<RecurringFormValues>
            key={cards[0]?.id ?? 'no-cards'}
            initialValues={{
              name: '',
              icon: '',
              description: '',
              amount: '' as unknown as number,
              currency: Currency.UYU,
              categoryId: '',
              cardId: cards[0]?.id ?? '',
              mode: RecurringMode.Auto,
              frequency: RecurringFrequency.Monthly,
              status: RecurringStatus.Active,
              dueDayOfMonth: undefined,
            }}
            validationSchema={recurringSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, values, setFieldValue, status }) => (
              <Form className={styles.form} noValidate>
                <h2 className={styles.formTitle}>Nuevo recurrente</h2>

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
                  <SelectInput name="cardId" options={cardOptions} placeholder={cardOptions.length === 0 ? 'Sin tarjetas' : undefined} />
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                    Guardar
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}

        {Object.entries(grouped).map(([catId, items]) => {
          const cat = categories.find((c) => c.id === catId)
          return (
            <React.Fragment key={catId}>
              <p className={styles.groupLabel}>
                {cat ? `${cat.icon} ${cat.name}` : 'Sin categoría'}
              </p>
              {items.map(renderItem)}
            </React.Fragment>
          )
        })}

        {recurring.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
            No hay pagos recurrentes.
          </p>
        )}
      </div>
    </div>
  )
}
