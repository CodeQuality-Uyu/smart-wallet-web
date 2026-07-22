// src/features/recurring/components/RecurringFormModal.tsx

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Formik, Form } from 'formik'
import type { FormikHelpers } from 'formik'
import { useCreateRecurring } from '@/features/recurring/hooks/useRecurring'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { CategoryPickerModal } from '@/features/expenses/components/CategoryPickerModal'
import { recurringSchema, type RecurringFormValues } from '@/features/recurring/schemas/recurringSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { FREQUENCY_OPTIONS } from '@/utils/recurringSchedule'
import { RecurringMode, RecurringFrequency, RecurringStatus, Currency, CardType } from '@/types/enums'
import type { RecurringExpense } from '@/types/models'
import styles from './RecurringFormModal.module.css'

const ICON_OPTIONS = ['📺', '🎵', '☁️', '💡', '🌊', '📱', '🎮', '🏠', '💊', '🔒', '📰', '🚗']

const CURRENCY_OPTIONS = [
  { value: Currency.UYU, label: 'UYU' },
  { value: Currency.USD, label: 'USD' },
]

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const FREQ_SELECT_OPTIONS = FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const MONTH_SELECT_OPTIONS = MONTH_NAMES.map((n, i) => ({ value: String(i + 1), label: n }))

interface RecurringFormModalProps {
  onClose: () => void
  /** Overrides merged over the blank defaults — used to seed the form from an existing line. */
  initialValues?: Partial<RecurringFormValues>
  /** Called with the created recurring payment after a successful save. */
  onCreated?: (created: RecurringExpense) => void
  title?: string
}

export function RecurringFormModal({
  onClose,
  initialValues,
  onCreated,
  title = '＋ Agregar pago recurrente',
}: RecurringFormModalProps): React.ReactElement {
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { mutateAsync: createRecurring } = useCreateRecurring()
  const [showCategoryModal, setShowCategoryModal] = React.useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return (): void => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return (): void => { document.body.style.overflow = prev }
  }, [])

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: `${c.bank} · ${c.type === CardType.Credit ? 'Crédito' : c.type === CardType.Debit ? 'Débito' : 'Transferencia'} ···· ${c.lastFour ?? '----'}`,
  }))

  const baseValues: RecurringFormValues = {
    name: '',
    icon: '',
    description: '',
    amount: '' as unknown as number,
    currency: Currency.UYU,
    categoryIds: [],
    cardId: cards[0]?.id ?? '',
    mode: RecurringMode.Auto,
    frequency: RecurringFrequency.Monthly,
    status: RecurringStatus.Active,
    dueDayOfMonth: '' as unknown as number,
    startMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear(),
    ...initialValues,
  }

  async function handleSubmit(
    values: RecurringFormValues,
    { setStatus }: FormikHelpers<RecurringFormValues>,
  ): Promise<void> {
    try {
      const created = await createRecurring({
        name: values.name,
        icon: values.icon,
        description: values.description || undefined,
        amount: values.amount,
        currency: values.currency,
        categoryIds: values.categoryIds as string[],
        cardId: values.cardId,
        mode: values.mode,
        frequency: values.frequency,
        status: RecurringStatus.Active,
        dueDayOfMonth: values.dueDayOfMonth,
        startMonth: values.frequency === RecurringFrequency.Monthly ? undefined : Number(values.startMonth),
        startYear: values.frequency === RecurringFrequency.Monthly ? undefined : Number(values.startYear),
      })
      onCreated?.(created)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <Formik<RecurringFormValues>
          key={cards[0]?.id ?? 'no-cards'}
          initialValues={baseValues}
          validationSchema={recurringSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, values, setFieldValue, status }) => (
              <Form className={styles.modalForm} noValidate>
                <div className={styles.desktopFormBody}>
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

                  <FormField
                    name="categoryIds"
                    label={values.categoryIds.length > 0 ? `Categorías (${values.categoryIds.length} seleccionadas)` : 'Categorías'}
                    labelRight={
                      <button type="button" className={styles.labelRightBtn} onClick={() => setShowCategoryModal(true)}>
                        Ver todas
                      </button>
                    }
                  >
                    <CategoryChips
                      categories={categories}
                      selected={values.categoryIds as string[]}
                      onChange={(ids) => void setFieldValue('categoryIds', ids)}
                      maxVisible={5}
                    />
                  </FormField>

                  {/* Monto + Moneda inline */}
                  <div className={styles.desktopAmountRow}>
                    <div style={{ flex: 1 }}>
                      <FormField name="amount" label="Monto">
                        <TextInput name="amount" type="number" min="0" step="any" placeholder="0.00" />
                      </FormField>
                    </div>
                    <div className={styles.desktopCurrencyCol}>
                      <FormField name="currency" label="Moneda">
                        <SelectInput name="currency" options={CURRENCY_OPTIONS} />
                      </FormField>
                    </div>
                  </div>

                  <FormField name="frequency" label="Frecuencia">
                    <SelectInput name="frequency" options={FREQ_SELECT_OPTIONS} />
                  </FormField>

                  {values.frequency !== RecurringFrequency.Monthly && (
                    <div className={styles.desktopAmountRow}>
                      <div style={{ flex: 1 }}>
                        <FormField name="startMonth" label="Mes de inicio del ciclo">
                          <SelectInput name="startMonth" options={MONTH_SELECT_OPTIONS} />
                        </FormField>
                      </div>
                      <div className={styles.desktopCurrencyCol}>
                        <FormField name="startYear" label="Año">
                          <TextInput name="startYear" type="number" min="2000" max="2100" />
                        </FormField>
                      </div>
                    </div>
                  )}

                  <FormField name="mode" label="Naturaleza">
                    <div className={styles.desktopToggle}>
                      {([RecurringMode.Auto, RecurringMode.Manual] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={[styles.desktopToggleOpt, values.mode === m ? styles.desktopToggleOptActive : ''].join(' ')}
                          onClick={() => void setFieldValue('mode', m)}
                        >
                          {m === RecurringMode.Auto ? '⚡ Automático' : '✋ Manual'}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField name="cardId" label="Método de pago">
                    <SelectInput name="cardId" options={cardOptions} placeholder={cardOptions.length === 0 ? 'Sin tarjetas' : undefined} />
                  </FormField>

                  <FormField name="dueDayOfMonth" label="Día de cobro">
                    <TextInput name="dueDayOfMonth" type="number" min="1" max="31" placeholder="15" />
                  </FormField>
                </div>

                {status && <p className={styles.formError}>{status}</p>}

                <div className={styles.desktopFormActions}>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Guardar pago recurrente
                  </Button>
                </div>

                {showCategoryModal && (
                  <CategoryPickerModal
                    selected={values.categoryIds as string[]}
                    onConfirm={(ids) => {
                      void setFieldValue('categoryIds', ids)
                      setShowCategoryModal(false)
                    }}
                    onClose={() => setShowCategoryModal(false)}
                  />
                )}
              </Form>
          )}
        </Formik>
      </div>
    </div>,
    document.body,
  )
}
