// src/features/expenses/components/ExpenseForm.tsx

import React from 'react'
import { Formik, Form } from 'formik'
import { expenseSchema, type ExpenseFormValues } from '../schemas/expenseSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { CategoryChips } from './CategoryChips'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { CardType, Currency } from '@/types/enums'
import styles from './ExpenseForm.module.css'

interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  submitLabel?: string
}

const CARD_TYPE_LABEL: Record<CardType, string> = {
  [CardType.Credit]: 'Crédito',
  [CardType.Debit]: 'Débito',
  [CardType.Transfer]: 'Transferencia',
}

const DEFAULT_VALUES: ExpenseFormValues = {
  description: '',
  amount: 0,
  currency: Currency.UYU,
  cardId: '',
  categoryIds: [],
  placeId: '',
  date: new Date().toISOString().split('T')[0] ?? '',
}

export function ExpenseForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar gasto',
}: ExpenseFormProps): React.ReactElement {
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: c.lastFour
      ? `${c.bank} · ${CARD_TYPE_LABEL[c.type] ?? c.type} ···· ${c.lastFour}`
      : `${c.bank} · ${CARD_TYPE_LABEL[c.type] ?? c.type}`,
  }))

  const placeOptions = places.map((p) => ({ value: p.id, label: p.name }))

  const currencyOptions = [
    { value: Currency.UYU, label: 'Pesos (UYU)' },
    { value: Currency.USD, label: 'Dólares (USD)' },
  ]

  const firstCardId = cards[0]?.id ?? ''

  return (
    <Formik
      key={firstCardId}
      initialValues={{
        ...DEFAULT_VALUES,
        cardId: firstCardId || DEFAULT_VALUES.cardId,
        ...initialValues,
      }}
      validationSchema={expenseSchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ isSubmitting, values, setFieldValue }) => (
        <Form className={styles.form} noValidate>

          {/* Amount + currency toggle */}
          <div className={styles.amountSection}>
            <p className={styles.amountLabel}>¿Cuánto gastaste?</p>
            <div className={styles.amountRow}>
              <FormField name="amount" label="">
                <TextInput
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={styles.amountInput}
                  aria-label="Monto"
                />
              </FormField>
              <div className={styles.currencyToggle} role="group" aria-label="Moneda">
                {currencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={[
                      styles.currencyBtn,
                      values.currency === opt.value ? styles.currencyBtnActive : '',
                    ].join(' ')}
                    onClick={() => void setFieldValue('currency', opt.value)}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.fields}>
            <FormField name="description" label="Descripción">
              <TextInput name="description" placeholder="¿Qué compraste?" />
            </FormField>

            <FormField name="cardId" label="Tarjeta / pago">
              <SelectInput
                name="cardId"
                options={cardOptions}
                placeholder="Seleccioná una tarjeta"
                icon="💳"
              />
            </FormField>

            <FormField name="categoryIds" label="Categorías (una o más)">
              <CategoryChips
                categories={categories}
                selected={values.categoryIds}
                onChange={(ids) => void setFieldValue('categoryIds', ids)}
              />
              {/* Inline create hint */}
              <p className={styles.createHint}>
                ¿No encontrás la categoría?{' '}
                <a href="/settings/categories" className={styles.createLink}>
                  Crear nueva →
                </a>
              </p>
            </FormField>

            <FormField name="placeId" label="Lugar">
              <SelectInput
                name="placeId"
                options={placeOptions}
                placeholder="Seleccioná un lugar"
                icon="📍"
              />
              <p className={styles.createHint}>
                ¿No encontrás el lugar?{' '}
                <a href="/settings/places" className={styles.createLink}>
                  Crear nuevo →
                </a>
              </p>
            </FormField>

            <FormField name="date" label="Fecha">
              <TextInput name="date" type="date" max={new Date().toISOString().split('T')[0]} />
            </FormField>
          </div>

          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting} fullWidth>
              {submitLabel}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
