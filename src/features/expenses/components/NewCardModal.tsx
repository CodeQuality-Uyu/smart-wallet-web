// src/features/expenses/components/NewCardModal.tsx

import React from 'react'
import { Formik, Form } from 'formik'
import { Modal } from '@/components/ui/Modal'
import { useCreateCard } from '@/features/cards/hooks/useCards'
import { cardSchema, type CardFormValues } from '@/features/cards/schemas/cardSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { CardType } from '@/types/enums'
import type { Card } from '@/types/models'
import styles from './NewCardModal.module.css'

const CARD_TYPE_OPTIONS = [
  { value: CardType.Credit, label: 'Crédito' },
  { value: CardType.Debit, label: 'Débito' },
]

const BANK_OPTIONS = [
  { value: 'Itaú', label: 'Itaú' },
  { value: 'Santander', label: 'Santander' },
  { value: 'BROU', label: 'BROU' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'Scotiabank', label: 'Scotiabank' },
  { value: 'Otro', label: 'Otro' },
]

interface NewCardModalProps {
  onClose: () => void
  onCreated: (card: Card) => void
}

export function NewCardModal({ onClose, onCreated }: NewCardModalProps): React.ReactElement {
  const { mutateAsync: createCard } = useCreateCard()

  async function handleSubmit(values: CardFormValues): Promise<void> {
    const card = await createCard({
      name: `${values.bank} ${values.type === CardType.Credit ? 'Crédito' : values.type === CardType.Debit ? 'Débito' : ''}`.trim(),
      type: values.type,
      bank: values.bank,
      lastFour: values.lastFour,
    })
    onCreated(card)
  }

  return (
    <Modal title="Nueva tarjeta" onClose={onClose} width={400}>
      <div className={styles.body}>
        <Formik<CardFormValues>
          initialValues={{ type: CardType.Credit, bank: 'Itaú', lastFour: '' }}
          validationSchema={cardSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form>
              <div className={styles.typeLabel}>Tipo</div>
              <div className={styles.typeSelector}>
                {CARD_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={[styles.typeOpt, values.type === opt.value ? styles.typeOptActive : ''].join(' ')}
                    onClick={() => void setFieldValue('type', opt.value)}
                  >
                    <span>{opt.value === CardType.Credit ? '💳' : '💵'}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              <FormField name="bank" label="Banco">
                <SelectInput name="bank" options={BANK_OPTIONS} />
              </FormField>

              <FormField name="lastFour" label="Últimos 4 dígitos">
                <TextInput
                  name="lastFour"
                  placeholder="0000"
                  maxLength={4}
                  style={{ fontFamily: 'var(--font-num)', letterSpacing: '.2em', fontSize: 18, textAlign: 'center' }}
                />
              </FormField>

              <div className={styles.actions}>
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button type="submit" loading={isSubmitting}>Agregar tarjeta</Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Modal>
  )
}
