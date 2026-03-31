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
import { RecurringMode, RecurringFrequency, RecurringStatus, Currency, CardType } from '@/types/enums'
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

  // Totals for active recurring
  const active = recurring.filter((r) => r.status === RecurringStatus.Active)
  const monthlyUsd = active.filter((r) => r.currency === Currency.USD && r.frequency === RecurringFrequency.Monthly).reduce((s, r) => s + r.amount, 0)
  const monthlyUyu = active.filter((r) => r.currency === Currency.UYU && r.frequency === RecurringFrequency.Monthly).reduce((s, r) => s + r.amount, 0)
  const annualUsd = active.filter((r) => r.currency === Currency.USD && r.frequency === RecurringFrequency.Annual).reduce((s, r) => s + r.amount, 0)
  const annualUyu = active.filter((r) => r.currency === Currency.UYU && r.frequency === RecurringFrequency.Annual).reduce((s, r) => s + r.amount, 0)
  const equivMonthlyUsd = monthlyUsd + annualUsd / 12
  const equivMonthlyUyu = monthlyUyu + annualUyu / 12

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
    const card = cards.find((c) => c.id === item.cardId)
    const cardLabel = card ? `${card.type === CardType.Credit ? 'Crédito' : card.type === CardType.Debit ? 'Débito' : 'Transf.'} ${card.bank}` : ''
    const dayLabel = item.dueDayOfMonth ? `Día ${item.dueDayOfMonth}` : null
    const subtitle = [cardLabel, dayLabel].filter(Boolean).join(' · ')
    const freqLabel = `${item.frequency === RecurringFrequency.Annual ? 'año' : 'mes'}`
    const symbol = item.currency === Currency.USD ? 'U$S' : '$'

    return (
      <article
        key={item.id}
        className={styles.item}
        onClick={() => navigate(`/settings/recurring/${item.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/settings/recurring/${item.id}`)}
      >
        <div className={styles.itemIcon}>{item.icon}</div>
        <div className={styles.itemInfo}>
          <p className={styles.itemName}>
            {item.name}
            {item.status === RecurringStatus.Paused && (
              <span className={styles.pausedBadge}>Pausado</span>
            )}
          </p>
          {subtitle && <p className={styles.itemSub}>{subtitle}</p>}
        </div>
        <div className={styles.itemRight}>
          <p className={styles.itemAmt}><span className={styles.itemAmtSymbol}>{symbol}</span> {formatCurrency(item.amount, item.currency).replace(/^[^0-9]+/, '')}</p>
          <p className={styles.itemFreq}>{item.currency}/{freqLabel}</p>
        </div>
      </article>
    )
  }

  return (
    <div>
      <PageHeader title="Recurrentes" subtitle="Suscripciones y gastos fijos" showBack />

      <div className={styles.body}>
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
                {cat ? cat.name : 'Sin categoría'}
              </p>
              {items.map(renderItem)}
            </React.Fragment>
          )
        })}

        {recurring.length === 0 && (
          <p className={styles.empty}>No hay pagos recurrentes.</p>
        )}

        {active.length > 0 && (
          <div className={styles.totalsCard}>
            <p className={styles.totalsTitle}>Totales activos</p>
            <div className={styles.totalsGrid}>
              {equivMonthlyUsd > 0 && (
                <div className={styles.totalsItem}>
                  <span className={styles.totalsLbl}>U$S / mes</span>
                  <span className={styles.totalsVal}><span className={styles.totalsSymbol}>U$S</span> {formatCurrency(equivMonthlyUsd, Currency.USD).replace(/^[^0-9]+/, '')}</span>
                </div>
              )}
              {equivMonthlyUyu > 0 && (
                <div className={styles.totalsItem}>
                  <span className={styles.totalsLbl}>$ / mes</span>
                  <span className={styles.totalsVal}>{formatCurrency(equivMonthlyUyu, Currency.UYU)}</span>
                </div>
              )}
              {annualUsd > 0 && (
                <div className={styles.totalsItem}>
                  <span className={styles.totalsLbl}>U$S / año</span>
                  <span className={styles.totalsVal}><span className={styles.totalsSymbol}>U$S</span> {formatCurrency(annualUsd, Currency.USD).replace(/^[^0-9]+/, '')}</span>
                </div>
              )}
              {annualUyu > 0 && (
                <div className={styles.totalsItem}>
                  <span className={styles.totalsLbl}>$ / año</span>
                  <span className={styles.totalsVal}>{formatCurrency(annualUyu, Currency.UYU)}</span>
                </div>
              )}
            </div>
            {(annualUsd > 0 || annualUyu > 0) && (
              <p className={styles.totalsNote}>Equiv. mensual incluye anuales ÷ 12</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
