// src/pages/CardsPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from '@/features/cards/hooks/useCards'
import type { Card } from '@/types/models'
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

const CARD_COLOR_OPTIONS = [
  { value: 'linear-gradient(135deg,#0c1f1a,#0d3528)', label: 'Verde oscuro' },
  { value: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', label: 'Índigo' },
  { value: 'linear-gradient(135deg,#1a1530,#2d1f4e)', label: 'Violeta' },
  { value: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', label: 'Rojo' },
  { value: 'linear-gradient(135deg,#0d2e14,#1a6b28)', label: 'Verde' },
  { value: 'linear-gradient(135deg,#0c1a3a,#1e40af)', label: 'Azul' },
  { value: 'linear-gradient(135deg,#1c1917,#44403c)', label: 'Gris' },
  { value: 'linear-gradient(135deg,#78350f,#d97706)', label: 'Ámbar' },
]

function cardGradient(color?: string): string {
  return color ?? 'linear-gradient(135deg,#0c1f1a,#0d3528)'
}

function cardStatusLabel(type: CardType): string {
  if (type === CardType.Credit) return 'Crédito'
  return 'Débito'
}

function cardStatusClass(type: CardType, styles: Record<string, string>): string {
  if (type === CardType.Credit)
    return [styles.cardStatusBadge, styles.cardStatusBadgeCredit].join(' ')
  if (type === CardType.Debit)
    return [styles.cardStatusBadge, styles.cardStatusBadgeDebit].join(' ')
  return styles.cardStatusBadge ?? ''
}

const DEFAULT_CARD_KEY = 'sw_default_card_id'

export default function CardsPage(): React.ReactElement {
  const { data: cards = [], isLoading } = useCards()
  const { mutateAsync: createCard } = useCreateCard()
  const { mutateAsync: updateCard } = useUpdateCard()
  const { mutateAsync: deleteCard } = useDeleteCard()
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaultCardId, setDefaultCardId] = useState<string | null>(
    () => localStorage.getItem(DEFAULT_CARD_KEY)
  )
  const [showDefaultPicker, setShowDefaultPicker] = useState(false)

  if (isLoading) return <LoadingSpinner fullPage />

  function cardName(bank: string, type: CardType): string {
    return `${bank} ${type === CardType.Credit ? 'Crédito' : type === CardType.Debit ? 'Débito' : ''}`.trim()
  }

  async function handleSubmit(values: CardFormValues): Promise<void> {
    await createCard({ name: cardName(values.bank, values.type), type: values.type, bank: values.bank, lastFour: values.lastFour, color: values.color })
    setShowForm(false)
  }

  async function handleEditSubmit(values: CardFormValues): Promise<void> {
    if (!editingCard) return
    await updateCard({ id: editingCard.id, payload: { name: cardName(values.bank, values.type), type: values.type, bank: values.bank, lastFour: values.lastFour, color: values.color } })
    setEditingCard(null)
  }

  const defaultCard = cards.find((c) => c.id === defaultCardId) ?? cards[0] ?? null

  function handleSetDefault(id: string): void {
    localStorage.setItem(DEFAULT_CARD_KEY, id)
    setDefaultCardId(id)
    setShowDefaultPicker(false)
  }

  return (
    <div>
      <PageHeader
        title="Métodos de Pago"
        subtitle="Gestioná tus tarjetas, cuentas bancarias y billeteras digitales"
      />

      <div className={styles.body}>
        {/* Mobile add button */}
        <button className={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          ＋ Agregar tarjeta
        </button>

        {/* Edit form */}
        {editingCard && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Editar tarjeta</h2>
            <Formik<CardFormValues>
              enableReinitialize
              initialValues={{
                type: editingCard.type,
                bank: editingCard.bank,
                lastFour: editingCard.lastFour ?? '',
                color: editingCard.color ?? CARD_COLOR_OPTIONS[0]!.value,
              }}
              validationSchema={cardSchema}
              onSubmit={handleEditSubmit}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                  <div className={styles.colorPreview} style={{ background: values.color ?? CARD_COLOR_OPTIONS[0]!.value }}>
                    <p className={styles.colorPreviewNumber}>•••• •••• •••• {values.lastFour || '——'}</p>
                    <p className={styles.colorPreviewBank}>{values.bank}</p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className={styles.typeLabel}>Color</label>
                    <div className={styles.colorSwatches}>
                      {CARD_COLOR_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button"
                          className={[styles.colorSwatch, values.color === opt.value ? styles.colorSwatchActive : ''].join(' ')}
                          style={{ background: opt.value }}
                          onClick={() => void setFieldValue('color', opt.value)}
                          aria-label={opt.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className={styles.typeLabel}>Tipo</label>
                    <div className={styles.typeSelector}>
                      {CARD_TYPE_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button"
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
                    <TextInput name="lastFour" placeholder="0000" maxLength={4}
                      style={{ fontFamily: 'var(--font-num)', letterSpacing: '.2em', fontSize: 18, textAlign: 'center' }}
                    />
                  </FormField>
                  <div className={styles.formActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCard(null)}>Cancelar</Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>Guardar cambios</Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Nueva tarjeta</h2>
            <Formik<CardFormValues>
              initialValues={{
                type: CardType.Credit,
                bank: 'Itaú',
                lastFour: '',
                color: CARD_COLOR_OPTIONS[0]!.value,
              }}
              validationSchema={cardSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                  {/* Color preview */}
                  <div
                    className={styles.colorPreview}
                    style={{ background: values.color ?? CARD_COLOR_OPTIONS[0]!.value }}
                  >
                    <p className={styles.colorPreviewNumber}>•••• •••• •••• ——</p>
                    <p className={styles.colorPreviewBank}>{values.bank}</p>
                  </div>

                  {/* Color picker */}
                  <div style={{ marginBottom: 14 }}>
                    <label className={styles.typeLabel}>Color</label>
                    <div className={styles.colorSwatches}>
                      {CARD_COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={[
                            styles.colorSwatch,
                            values.color === opt.value ? styles.colorSwatchActive : '',
                          ].join(' ')}
                          style={{ background: opt.value }}
                          onClick={() => void setFieldValue('color', opt.value)}
                          aria-label={opt.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className={styles.typeLabel}>Tipo</label>
                    <div className={styles.typeSelector}>
                      {CARD_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={[
                            styles.typeOpt,
                            values.type === opt.value ? styles.typeOptActive : '',
                          ].join(' ')}
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
                      style={{
                        fontFamily: 'var(--font-num)',
                        letterSpacing: '.2em',
                        fontSize: 18,
                        textAlign: 'center',
                      }}
                    />
                  </FormField>

                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForm(false)}
                    >
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

        {/* Cards grid */}
        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div
              key={card.id}
              className={styles.card}
              style={{ background: cardGradient(card.color) }}
              onClick={() => { setEditingCard(card); setShowForm(false) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (setEditingCard(card), setShowForm(false))}
            >
              {/* Mobile layout */}
              <div className={styles.cardBadge}>{card.type === CardType.Credit ? '💳' : '💵'}</div>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{card.name}</p>
                <p className={styles.cardLast4}>
                  {card.lastFour ? `•••• •••• •••• ${card.lastFour}` : 'Sin número'}
                </p>
                <p className={styles.cardTypeLbl}>
                  {card.type === CardType.Credit ? 'Crédito' : 'Débito'} · {card.bank}
                </p>
              </div>

              {/* Desktop layout */}
              <div className={styles.cardTop}>
                <span className={cardStatusClass(card.type, styles as Record<string, string>)}>
                  {cardStatusLabel(card.type)}
                </span>
                <button
                  className={styles.cardDelete}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingId(card.id)
                    void deleteCard(card.id).finally(() => setDeletingId(null))
                  }}
                  disabled={deletingId === card.id}
                  aria-label="Eliminar tarjeta"
                >
                  {deletingId === card.id ? '…' : '✕'}
                </button>
              </div>
              <p className={styles.cardNumber}>
                {card.lastFour ? `•••• •••• •••• ${card.lastFour}` : '•••• •••• •••• ——'}
              </p>
              <div className={styles.cardBottom}>
                <div className={styles.cardMeta}>
                  <p className={styles.cardMetaLabel}>Banco</p>
                  <p className={styles.cardHolder}>{card.bank}</p>
                </div>
                <div className={styles.cardMeta} style={{ textAlign: 'right' }}>
                  <p className={styles.cardMetaLabel}>Tipo</p>
                  <p className={styles.cardExpiry}>
                    {card.type === CardType.Credit ? 'Crédito' : card.type === CardType.Debit ? 'Débito' : 'Transfer.'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder */}
          <button className={styles.cardPlaceholder} onClick={() => setShowForm((s) => !s)}>
            <div className={styles.cardPlaceholderIcon}>+</div>
            <span className={styles.cardPlaceholderText}>Agregar tarjeta</span>
            <span className={styles.cardPlaceholderSub}>Débito o crédito</span>
          </button>
        </div>

        {/* Footer default method */}
        <div className={styles.defaultFooter}>
          <div className={styles.defaultFooterLeft}>
            <span className={styles.defaultFooterIcon}>⚙️</span>
            <div>
              <p className={styles.defaultLabel}>Método por defecto</p>
              <p className={styles.defaultSub}>
                Se usará al registrar gastos sin especificar método
              </p>
            </div>
          </div>
          <div className={styles.defaultRight}>
            <span className={styles.defaultCard}>
              {defaultCard
                ? `${defaultCard.bank} ${defaultCard.lastFour ? `····${defaultCard.lastFour}` : ''}`
                : 'Sin configurar'}
            </span>
            <button className={styles.defaultLink} onClick={() => setShowDefaultPicker((s) => !s)}>
              Cambiar
            </button>
          </div>
        </div>
        {showDefaultPicker && (
          <div className={styles.defaultPicker}>
            {cards.map((card) => (
              <button
                key={card.id}
                className={[styles.defaultPickerItem, card.id === defaultCard?.id ? styles.defaultPickerItemActive : ''].join(' ')}
                onClick={() => handleSetDefault(card.id)}
              >
                <span
                  className={styles.defaultPickerSwatch}
                  style={{ background: cardGradient(card.color) }}
                />
                {card.bank}{card.lastFour ? ` ····${card.lastFour}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
