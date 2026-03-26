// src/pages/RecurringPage.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecurringList, useCreateRecurring } from '@/features/recurring/hooks/useRecurring'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatCurrency } from '@/utils/formatCurrency'
import { RecurringMode, RecurringPaymentStatus, RecurringStatus, Currency } from '@/types/enums'
import styles from './RecurringPage.module.css'

const ICON_OPTIONS = ['📺', '🎵', '☁️', '💡', '🌊', '📱', '🎮', '🏠', '💊', '🔒', '📰', '🚗']
const CURRENCIES = [Currency.UYU, Currency.USD]

interface RecurringForm {
  name: string
  icon: string
  amount: string
  currency: Currency
  categoryIds: string[]
  cardId: string
  mode: RecurringMode
  dueDayOfMonth: string
}

const EMPTY_FORM: RecurringForm = {
  name: '',
  icon: '',
  amount: '',
  currency: Currency.UYU,
  categoryIds: [],
  cardId: '',
  mode: RecurringMode.Auto,
  dueDayOfMonth: '',
}

export default function RecurringPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: recurring = [], isLoading, error, refetch } = useRecurringList()
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { mutateAsync: createRecurring } = useCreateRecurring()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<RecurringForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const subscriptions = recurring.filter((r) => r.categoryId === 'cat-7')
  const services = recurring.filter((r) => r.categoryId !== 'cat-7')

  if (isLoading) return <LoadingSpinner fullPage />
  if (error) return <ErrorMessage onRetry={() => void refetch()} />

  type StringField = { [K in keyof RecurringForm]: RecurringForm[K] extends string ? K : never }[keyof RecurringForm]
  function setField(key: StringField, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('El nombre es requerido.'); return }
    if (!form.icon) { setFormError('Seleccioná un ícono.'); return }
    if (!form.amount || Number(form.amount) <= 0) { setFormError('El monto debe ser mayor a 0.'); return }
    if (form.categoryIds.length === 0) { setFormError('Seleccioná al menos una categoría.'); return }
    if (!form.cardId) { setFormError('Seleccioná un medio de pago.'); return }
    if (form.mode === RecurringMode.Manual && !form.dueDayOfMonth) {
      setFormError('Ingresá el día de vencimiento.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await createRecurring({
        name: form.name.trim(),
        icon: form.icon,
        amount: Number(form.amount),
        currency: form.currency,
        categoryId: form.categoryIds[0] ?? '',
        cardId: form.cardId,
        mode: form.mode,
        status: RecurringStatus.Active,
        dueDayOfMonth: form.mode === RecurringMode.Manual ? Number(form.dueDayOfMonth) : undefined,
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
    } finally {
      setSaving(false)
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
            <span className={styles.itemCurr}>{item.currency}</span>
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
          <form className={styles.form} onSubmit={(e) => { void handleSubmit(e) }} noValidate>
            <h2 className={styles.formTitle}>Nuevo recurrente</h2>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <label className={styles.fieldLabel} htmlFor="rec-name">Nombre</label>
                <input
                  id="rec-name"
                  type="text"
                  className={styles.fieldInput}
                  placeholder="ej. Netflix"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Ícono</span>
              <div className={styles.iconPicker} role="group">
                {ICON_OPTIONS.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    className={[styles.icoBtn, form.icon === ico ? styles.icoBtnActive : ''].join(' ')}
                    onClick={() => setField('icon', ico)}
                    aria-pressed={form.icon === ico}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <label className={styles.fieldLabel} htmlFor="rec-amount">Monto</label>
                <input
                  id="rec-amount"
                  type="number"
                  min="0"
                  step="any"
                  className={styles.fieldInput}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup} style={{ width: 90 }}>
                <label className={styles.fieldLabel} htmlFor="rec-currency">Moneda</label>
                <select
                  id="rec-currency"
                  className={styles.fieldInput}
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Categoría</span>
              <CategoryChips
                categories={categories}
                selected={form.categoryIds}
                onChange={(ids) => setForm((prev) => ({ ...prev, categoryIds: ids }))}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="rec-card">Medio de pago</label>
              <select
                id="rec-card"
                className={styles.fieldInput}
                value={form.cardId}
                onChange={(e) => setField('cardId', e.target.value)}
              >
                <option value="">Seleccioná...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Modo de pago</span>
              <div className={styles.modeSelector}>
                {([RecurringMode.Auto, RecurringMode.Manual] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={[styles.modeOpt, form.mode === m ? styles.modeOptActive : ''].join(' ')}
                    onClick={() => setField('mode', m)}
                  >
                    {m === RecurringMode.Auto ? '⚡ Automático' : '✋ Manual'}
                  </button>
                ))}
              </div>
            </div>

            {form.mode === RecurringMode.Manual && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="rec-dueday">Día de vencimiento</label>
                <input
                  id="rec-dueday"
                  type="number"
                  min="1"
                  max="31"
                  className={styles.fieldInput}
                  placeholder="ej. 15"
                  value={form.dueDayOfMonth}
                  onChange={(e) => setField('dueDayOfMonth', e.target.value)}
                />
              </div>
            )}

            {formError && <p style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 8 }}>{formError}</p>}

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError('') }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="secondary" size="sm" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        )}

        <p className={styles.groupLabel}>Suscripciones</p>
        {subscriptions.map(renderItem)}

        <p className={styles.groupLabel}>Servicios del hogar</p>
        {services.map(renderItem)}
      </div>
    </div>
  )
}
