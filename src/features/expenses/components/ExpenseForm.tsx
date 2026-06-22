// src/features/expenses/components/ExpenseForm.tsx

import React, { useRef, useState } from 'react'
import { Formik, Form, useFormikContext } from 'formik'
import { expenseSchema, type ExpenseFormValues } from '../schemas/expenseSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { CategoryChips } from '@/components/shared/CategoryChips'
import { NewCardModal } from './NewCardModal'
import { CategoryPickerModal } from './CategoryPickerModal'
import { NewPlaceModal } from './NewPlaceModal'
import { CategorySuggestionBanner } from './CategorySuggestionBanner'
import suggestionStyles from './CategorySuggestionBanner.module.css'
import { useCategories, useCreateCategory } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useCategorySuggestion } from '../hooks/useCategorySuggestion'
import { Currency } from '@/types/enums'
import { cardOptions } from '@/features/cards/cardUtils'
import type { Category } from '@/types/models'
import type { NewCategorySuggestion } from '@/services/geminiService'
import styles from './ExpenseForm.module.css'

interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  submitLabel?: string
  variant?: 'mobile' | 'desktop'
  onCancel?: () => void
}


const DEFAULT_VALUES: ExpenseFormValues = {
  description: '',
  amount: 0,
  currency: Currency.UYU,
  cardId: '',
  categoryIds: [],
  placeId: '',
  date: new Date().toISOString().split('T')[0] ?? '',
  receiptFile: undefined,
}

type ActiveModal = 'card' | 'categories' | 'place' | null

// Inner component to access Formik context for suggestion banner
function CategorySuggestion({ categories }: { categories: Category[] }): React.ReactElement | null {
  const { values, setFieldValue } = useFormikContext<ExpenseFormValues>()
  const createCategory = useCreateCategory()
  const [dismissed, setDismissed] = useState(false)
  const [lastDismissedDesc, setLastDismissedDesc] = useState('')

  const { suggestion, isLoading } = useCategorySuggestion(values.description, categories)

  // Reset dismiss when description changes significantly
  const shouldShow =
    !dismissed ||
    (values.description !== lastDismissedDesc && values.description.length >= 3)

  if (!shouldShow) return null

  if (isLoading && !suggestion) {
    return (
      <div className={suggestionStyles.loading}>
        <span className={suggestionStyles.spinner} aria-hidden="true" />
        Buscando categorías sugeridas…
      </div>
    )
  }

  if (!suggestion) return null

  const handleDismiss = () => {
    setDismissed(true)
    setLastDismissedDesc(values.description)
  }

  const handleAcceptMatch = (categoryId: string) => {
    const current = values.categoryIds
    if (!current.includes(categoryId)) {
      void setFieldValue('categoryIds', [...current, categoryId])
    }
    handleDismiss()
  }

  const handleAcceptNew = async (s: NewCategorySuggestion) => {
    try {
      const created = await createCategory.mutateAsync({
        name: s.name,
        icon: s.icon,
        color: s.color,
        active: true,
        limitUYU: s.monthlyLimit,
      })
      const current = values.categoryIds
      if (!current.includes(created.id)) {
        void setFieldValue('categoryIds', [...current, created.id])
      }
    } finally {
      handleDismiss()
    }
  }

  return (
    <CategorySuggestionBanner
      suggestion={suggestion}
      categories={categories}
      onAcceptMatch={handleAcceptMatch}
      onAcceptNewSuggestion={(s) => void handleAcceptNew(s)}
      onDismiss={handleDismiss}
    />
  )
}

export function ExpenseForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar gasto',
  variant = 'mobile',
  onCancel,
}: ExpenseFormProps): React.ReactElement {
  const isDesktop = variant === 'desktop'
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces()

  const cardOpts = cardOptions(cards)

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
            <CategorySuggestion categories={categories} />

            <FormField name="cardId" label="Tarjeta / pago">
              <SelectInput
                name="cardId"
                options={cardOpts}
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

            <div className={styles.receiptField}>
              <p className={styles.receiptLabel}>Factura <span className={styles.receiptOptional}>(opcional)</span></p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className={styles.receiptHiddenInput}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? undefined
                  void setFieldValue('receiptFile', file)
                  e.target.value = ''
                }}
              />
              {!values.receiptFile ? (
                <button
                  type="button"
                  className={styles.receiptBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 Adjuntar factura
                </button>
              ) : (
                <div className={styles.receiptAttached}>
                  <span className={styles.receiptFileName}>📎 {values.receiptFile.name}</span>
                  <button
                    type="button"
                    className={styles.receiptClear}
                    onClick={() => void setFieldValue('receiptFile', undefined)}
                    aria-label="Quitar factura"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
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
