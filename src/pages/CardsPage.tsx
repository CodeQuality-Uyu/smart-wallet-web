// src/pages/CardsPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import { useCards, useCreateCard, useDeleteCard } from '@/features/cards/hooks/useCards'
import { cardSchema, type CardFormValues } from '@/features/cards/schemas/cardSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CardType } from '@/types/enums'
import styles from './CardsPage.module.css'

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

const CARD_GRADIENTS: Record<string, string> = {
  transfer: 'linear-gradient(135deg,#0d2e14,#1a6b28)',
  credit_itau: 'linear-gradient(135deg,#1e1b4b,#4f46e5)',
  debit_itau: 'linear-gradient(135deg,#1e1b4b,#312e81)',
  credit_santander: 'linear-gradient(135deg,#7f1d1d,#b91c1c)',
}

function cardGradient(type: CardType, bank: string): string {
  if (type === CardType.Transfer) return CARD_GRADIENTS['transfer'] ?? ''
  const key = `${type}_${bank.toLowerCase()}`
  return CARD_GRADIENTS[key] ?? 'linear-gradient(135deg,#1e1b4b,#4f46e5)'
}

export default function CardsPage(): React.ReactElement {
  const { data: cards = [], isLoading } = useCards()
  const { mutateAsync: createCard } = useCreateCard()
  const { mutateAsync: deleteCard } = useDeleteCard()
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(values: CardFormValues): Promise<void> {
    await createCard({
      name: `${values.bank} ${values.type === CardType.Credit ? 'Crédito' : values.type === CardType.Debit ? 'Débito' : ''}`.trim(),
      type: values.type,
      bank: values.bank,
      lastFour: values.lastFour,
    })
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader title="Tarjetas" subtitle="Tus métodos de pago" />

      <div className={styles.body}>
        <button className={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          ＋ Agregar tarjeta
        </button>

        {/* Create form */}
        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Nueva tarjeta</h2>
            <Formik<CardFormValues>
              initialValues={{ type: CardType.Credit, bank: 'Itaú', lastFour: '' }}
              validationSchema={cardSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                  {/* Type selector */}
                  <div style={{ marginBottom: 14 }}>
                    <label className={styles.typeLabel}>Tipo</label>
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

                  <div className={styles.formActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Agregar tarjeta
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {/* Existing cards */}
        {cards.map((card) => (
          <div
            key={card.id}
            className={styles.card}
            style={{ background: cardGradient(card.type, card.bank) }}
          >
            <div className={styles.cardBadge}>
              {card.type === CardType.Transfer ? '↔' : card.type === CardType.Credit ? '💳' : '💵'}
            </div>
            <div className={styles.cardInfo}>
              <p className={styles.cardName}>{card.name}</p>
              <p className={styles.cardLast4}>
                {card.lastFour ? `•••• •••• •••• ${card.lastFour}` : 'Sin número'}
              </p>
              <p className={styles.cardTypeLbl}>
                {card.type === CardType.Transfer ? 'Transferencia' : card.type === CardType.Credit ? 'Crédito' : 'Débito'} · {card.bank}
              </p>
            </div>
            <button
              className={styles.cardDelete}
              onClick={() => {
                setDeletingId(card.id)
                void deleteCard(card.id).finally(() => setDeletingId(null))
              }}
              disabled={deletingId === card.id}
              aria-label="Eliminar tarjeta"
            >
              {deletingId === card.id ? '…' : '✕'}
            </button>
          </div>
        ))}

      </div>
    </div>
  )
}
