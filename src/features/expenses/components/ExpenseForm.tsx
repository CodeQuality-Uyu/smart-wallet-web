// src/features/expenses/components/ExpenseForm.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import { expenseSchema, type ExpenseFormValues } from '../schemas/expenseSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { CategoryChips } from './CategoryChips'
import { NewCardModal } from './NewCardModal'
import { CategoryPickerModal } from './CategoryPickerModal'
import { NewPlaceModal } from './NewPlaceModal'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { CardType, Currency } from '@/types/enums'
import styles from './ExpenseForm.module.css'

interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  submitLabel?: string
  variant?: 'mobile' | 'desktop'
  onCancel?: () => void
}

const CARD_TYPE_LABEL: Record<CardType, string> = {
  [CardType.Credit]: 'Crédito',
  [CardType.Debit]: 'Débito',
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

type ActiveModal = 'card' | 'categories' | 'place' | null

export function ExpenseForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar gasto',
  variant = 'mobile',
  onCancel,
}: ExpenseFormProps): React.ReactElement {
  const isDesktop = variant === 'desktop'
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

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
          <div className={isDesktop ? styles.amountSectionDesktop : styles.amountSection}>
            <p className={isDesktop ? styles.amountLabelDesktop : styles.amountLabel}>
              ¿Cuánto gastaste?
            </p>
            <div className={styles.amountRow}>
              <span className={isDesktop ? styles.amtSymbolDesktop : styles.amtSymbol}>
                {values.currency === Currency.USD ? 'U$S' : '$'}
              </span>
              <FormField name="amount" label="">
                <TextInput
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={isDesktop ? styles.amountInputDesktop : styles.amountInput}
                  aria-label="Monto"
                  onFocus={(e) => {
                    if (Number(e.target.value) === 0) void setFieldValue('amount', '')
                  }}
                />
              </FormField>
              <div
                className={isDesktop ? styles.currencyToggleDesktop : styles.currencyToggle}
                role="group"
                aria-label="Moneda"
              >
                {currencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={[
                      isDesktop ? styles.currencyBtnDesktop : styles.currencyBtn,
                      values.currency === opt.value
                        ? isDesktop
                          ? styles.currencyBtnActiveDesktop
                          : styles.currencyBtnActive
                        : '',
                    ].join(' ')}
                    onClick={() => void setFieldValue('currency', opt.value)}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={isDesktop ? styles.fieldsDesktop : styles.fields}>
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
              <p className={styles.createHint}>
                ¿No encontrás el medio de pago?{' '}
                <button
                  type="button"
                  className={styles.createLink}
                  onClick={() => setActiveModal('card')}
                >
                  Agregar nueva
                </button>
              </p>
            </FormField>

            <FormField
              name="categoryIds"
              label={
                values.categoryIds.length > 0
                  ? `Categorías (${values.categoryIds.length} seleccionadas)`
                  : 'Categorías (una o más)'
              }
              labelRight={
                <button
                  type="button"
                  className={styles.createLinkRight}
                  onClick={() => setActiveModal('categories')}
                >
                  Ver todas
                </button>
              }
            >
              <CategoryChips
                categories={categories}
                selected={values.categoryIds}
                onChange={(ids) => void setFieldValue('categoryIds', ids)}
                maxVisible={5}
              />
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
                <button
                  type="button"
                  className={styles.createLink}
                  onClick={() => setActiveModal('place')}
                >
                  Crear nuevo
                </button>
              </p>
            </FormField>

            <FormField name="date" label="Fecha">
              <TextInput
                name="date"
                type="date"
                icon="📅"
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>
          </div>

          <div className={isDesktop ? styles.actionsDesktop : styles.actions}>
            {isDesktop && onCancel ? (
              <>
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {submitLabel}
                </Button>
              </>
            ) : (
              <Button type="submit" loading={isSubmitting} fullWidth>
                {submitLabel}
              </Button>
            )}
          </div>

          {/* Modals */}
          {activeModal === 'card' && (
            <NewCardModal
              onClose={() => setActiveModal(null)}
              onCreated={(card) => {
                void setFieldValue('cardId', card.id)
                setActiveModal(null)
              }}
            />
          )}

          {activeModal === 'categories' && (
            <CategoryPickerModal
              selected={values.categoryIds}
              onConfirm={(ids) => {
                void setFieldValue('categoryIds', ids)
                setActiveModal(null)
              }}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === 'place' && (
            <NewPlaceModal
              onClose={() => setActiveModal(null)}
              onCreated={(place) => {
                void setFieldValue('placeId', place.id)
                setActiveModal(null)
              }}
            />
          )}
        </Form>
      )}
    </Formik>
  )
}
