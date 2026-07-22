// src/pages/RecurringPage.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import type { FormikHelpers } from 'formik'
import { useRecurringList, useCreateRecurring, useToggleRecurringStatus, useDeleteRecurring } from '@/features/recurring/hooks/useRecurring'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCards } from '@/features/cards/hooks/useCards'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { recurringSchema, type RecurringFormValues } from '@/features/recurring/schemas/recurringSchema'
import { RecurringFormModal } from '@/features/recurring/components/RecurringFormModal'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { KebabMenu, type KebabMenuItem } from '@/components/shared/KebabMenu'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatCurrency } from '@/utils/formatCurrency'
import {
  frequencyLabel,
  frequencyPeriodLabel,
  monthlyEquivalent,
  computeOverdueMonths,
  FREQUENCY_OPTIONS,
} from '@/utils/recurringSchedule'
import { RecurringMode, RecurringFrequency, RecurringStatus, Currency, CardType } from '@/types/enums'
import type { RecurringExpense } from '@/types/models'
import styles from './RecurringPage.module.css'

const ICON_OPTIONS = ['📺', '🎵', '☁️', '💡', '🌊', '📱', '🎮', '🏠', '💊', '🔒', '📰', '🚗']

const CURRENCY_OPTIONS = [
  { value: Currency.UYU, label: 'UYU' },
  { value: Currency.USD, label: 'USD' },
]

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const FREQ_SELECT_OPTIONS = FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const MONTH_SELECT_OPTIONS = MONTH_NAMES.map((n, i) => ({ value: String(i + 1), label: n }))

// Period filter tabs for the desktop list — one per RecurringFrequency plus "Todos".
const FREQ_TAB_OPTIONS: { value: 'all' | RecurringFrequency; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: RecurringFrequency.Monthly, label: 'Mensual' },
  { value: RecurringFrequency.Bimonthly, label: 'Bimestral' },
  { value: RecurringFrequency.Quarterly, label: 'Trimestral' },
  { value: RecurringFrequency.Biannual, label: 'Semestral' },
  { value: RecurringFrequency.Annual, label: 'Anual' },
]

function getNextDueDate(dueDayOfMonth: number): string {
  const now = new Date()
  const day = dueDayOfMonth
  const month = now.getDate() >= day ? now.getMonth() + 1 : now.getMonth()
  const m = month > 11 ? 0 : month
  return `${String(day).padStart(2, '0')} ${MONTH_NAMES[m]}`
}

interface OverdueEntry {
  item: RecurringExpense
  missedMonths: Array<{ month: number; year: number }>
}

function getOverdueItems(recurring: RecurringExpense[]): OverdueEntry[] {
  const now = new Date()
  return recurring
    .filter((r) => r.status === RecurringStatus.Active && r.mode === RecurringMode.Manual)
    .map((r) => ({ item: r, missedMonths: computeOverdueMonths(r, now) }))
    .filter((entry) => entry.missedMonths.length > 0)
}

interface DesktopRowProps {
  item: RecurringExpense
  cards: { id: string; bank: string; type: CardType; lastFour?: string }[]
  onNavigate: (id: string) => void
  showModeBadge: boolean
}

function DesktopRow({ item, cards, onNavigate, showModeBadge }: DesktopRowProps): React.ReactElement {
  const { mutate: toggle, isPending } = useToggleRecurringStatus(item.id)
  const { mutate: remove, isPending: isDeleting } = useDeleteRecurring()
  const [optimisticActive, setOptimisticActive] = React.useState(item.status === RecurringStatus.Active)

  // Sync optimistic state when server data changes
  React.useEffect(() => {
    setOptimisticActive(item.status === RecurringStatus.Active)
  }, [item.status])

  const card = cards.find((c) => c.id === item.cardId)
  const cardLabel = card
    ? `${card.type === CardType.Credit ? 'Crédito' : card.type === CardType.Debit ? 'Débito' : 'Transf.'} ${card.bank}`
    : ''
  const symbol = item.currency === Currency.USD ? 'U$S' : '$'
  const freqLabel = frequencyLabel(item.frequency)
  const nextLabel = item.dueDayOfMonth ? getNextDueDate(item.dueDayOfMonth) : '—'

  function handleToggle(): void {
    const next = !optimisticActive
    setOptimisticActive(next)
    toggle(next ? RecurringStatus.Active : RecurringStatus.Paused)
  }

  function handleDelete(): void {
    if (window.confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) {
      remove(item.id)
    }
  }

  const menuItems: KebabMenuItem[] = [
    { label: 'Editar', icon: '✏️', onClick: () => onNavigate(item.id) },
    {
      label: optimisticActive ? 'Pausar' : 'Activar',
      icon: optimisticActive ? '⏸' : '▶',
      onClick: handleToggle,
      disabled: isPending,
    },
    ...(!optimisticActive
      ? [{ label: 'Eliminar', icon: '🗑', danger: true, disabled: isDeleting, onClick: handleDelete }]
      : []),
  ]

  return (
    <div
      className={[styles.desktopRow, optimisticActive ? '' : styles.desktopRowPaused].join(' ')}
      onClick={() => onNavigate(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
    >
      {!optimisticActive && <span className={styles.drPauseOverlay} aria-hidden>⏸</span>}
      <div className={styles.drIcon}>{item.icon || '💳'}</div>
      <div className={styles.drInfo}>
        <span className={styles.drName}>{item.name}</span>
        <div className={styles.drBadges}>
          {showModeBadge && (
            <span className={[styles.drBadge, item.mode === RecurringMode.Auto ? styles.drBadgeAuto : styles.drBadgeManual].join(' ')}>
              {item.mode === RecurringMode.Auto ? '⚡ AUTO' : '✋ MANUAL'}
            </span>
          )}
          <span className={styles.drBadgeFreq}>{freqLabel}</span>
        </div>
        <span className={styles.drMeta}>{cardLabel || '—'}</span>
      </div>
      <div className={styles.drAmount}>
        <span className={styles.drAmtNum}>
          <span className={styles.drAmtSymbol}>{symbol}</span>{' '}
          {formatCurrency(item.amount, item.currency).replace(/^[^0-9]+/, '')}
        </span>
        <span className={styles.drAmtCur}>{item.currency}</span>
      </div>
      <div className={styles.drNext}>
        <span className={styles.drNextLabel}>Vencimiento:</span>
        <span className={styles.drNextDate}>{nextLabel}</span>
      </div>
      <div className={styles.drMenuCell} onClick={(e) => e.stopPropagation()}>
        <KebabMenu items={menuItems} />
      </div>
    </div>
  )
}

export default function RecurringPage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: recurring = [], isLoading, error, refetch } = useRecurringList()
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { mutateAsync: createRecurring } = useCreateRecurring()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'auto' | 'manual'>('all')
  const [freqTab, setFreqTab] = useState<'all' | RecurringFrequency>('all')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  function toggleCat(catId: string): void {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: `${c.bank} · ${c.type === CardType.Credit ? 'Crédito' : c.type === CardType.Debit ? 'Débito' : 'Transferencia'} ···· ${c.lastFour ?? '----'}`,
  }))

  // Group recurring items by first categoryId (mobile)
  const grouped = recurring.reduce<Record<string, typeof recurring>>((acc, item) => {
    const key = item.categoryIds[0] ?? '__none__'
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  // Totals for active recurring — monthly equivalent prorates every interval.
  const active = recurring.filter((r) => r.status === RecurringStatus.Active)
  const annualUsd = active.filter((r) => r.currency === Currency.USD && r.frequency === RecurringFrequency.Annual).reduce((s, r) => s + r.amount, 0)
  const annualUyu = active.filter((r) => r.currency === Currency.UYU && r.frequency === RecurringFrequency.Annual).reduce((s, r) => s + r.amount, 0)
  const equivMonthlyUsd = active.filter((r) => r.currency === Currency.USD).reduce((s, r) => s + monthlyEquivalent(r), 0)
  const equivMonthlyUyu = active.filter((r) => r.currency === Currency.UYU).reduce((s, r) => s + monthlyEquivalent(r), 0)


  const overdueItems = getOverdueItems(recurring)
  const currentYear = new Date().getFullYear()

  // Desktop filtered list
  const filteredList = recurring.filter((r) => {
    if (activeTab === 'auto' && r.mode !== RecurringMode.Auto) return false
    if (activeTab === 'manual' && r.mode !== RecurringMode.Manual) return false
    if (freqTab !== 'all' && (r.frequency ?? RecurringFrequency.Monthly) !== freqTab) return false
    return true
  })

  // Group filtered list by first categoryId, preserving encounter order
  const groupedFiltered = filteredList.reduce<Array<{ catId: string; items: RecurringExpense[] }>>((acc, item) => {
    const key = item.categoryIds[0] ?? '__none__'
    const existing = acc.find((g) => g.catId === key)
    if (existing) existing.items.push(item)
    else acc.push({ catId: key, items: [item] })
    return acc
  }, [])

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
        categoryIds: values.categoryIds as string[],
        cardId: values.cardId,
        mode: values.mode,
        frequency: values.frequency,
        status: RecurringStatus.Active,
        dueDayOfMonth: values.dueDayOfMonth,
        startMonth: values.frequency === RecurringFrequency.Monthly ? undefined : Number(values.startMonth),
        startYear: values.frequency === RecurringFrequency.Monthly ? undefined : Number(values.startYear),
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
    const freqLabel = frequencyPeriodLabel(item.frequency)
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

  const desktopForm = showForm && <RecurringFormModal onClose={() => setShowForm(false)} />

  return (
    <div>
      {/* ── Mobile layout ── */}
      <div className={styles.mobileOnly}>
        <PageHeader title="Recurrentes" subtitle="Suscripciones y gastos fijos" />
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
                categoryIds: [],
                cardId: cards[0]?.id ?? '',
                mode: RecurringMode.Auto,
                frequency: RecurringFrequency.Monthly,
                status: RecurringStatus.Active,
                dueDayOfMonth: '' as unknown as number,
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
                  <FormField name="categoryIds" label="Categorías">
                    <CategoryChips
                      categories={categories}
                      selected={values.categoryIds as string[]}
                      onChange={(ids) => void setFieldValue('categoryIds', ids)}
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
                    <SelectInput name="frequency" options={FREQ_SELECT_OPTIONS} />
                  </FormField>
                  {values.frequency !== RecurringFrequency.Monthly && (
                    <div className={styles.formRow}>
                      <div style={{ flex: 1 }}>
                        <FormField name="startMonth" label="Mes de inicio">
                          <SelectInput name="startMonth" options={MONTH_SELECT_OPTIONS} />
                        </FormField>
                      </div>
                      <div style={{ width: 100 }}>
                        <FormField name="startYear" label="Año">
                          <TextInput name="startYear" type="number" min="2000" max="2100" />
                        </FormField>
                      </div>
                    </div>
                  )}
                  <FormField name="dueDayOfMonth" label="Día de vencimiento">
                    <TextInput name="dueDayOfMonth" type="number" min="1" max="31" placeholder="ej. 15" />
                  </FormField>
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
                <p className={styles.groupLabel}>{cat ? cat.name : 'Sin categoría'}</p>
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
                <p className={styles.totalsNote}>Equiv. mensual prorratea anuales y otros períodos</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className={styles.desktopOnly}>
        <div className={styles.desktopHeader}>
          <div>
            <h1 className={styles.desktopTitle}>Pagos Recurrentes</h1>
            <p className={styles.desktopSubtitle}>Gestioná tus suscripciones, servicios e impuestos que se repiten</p>
          </div>
          <button className={styles.desktopNewBtn} onClick={() => setShowForm((s) => !s)}>
            ＋ Nuevo pago recurrente
          </button>
        </div>

        {desktopForm}

        {/* Pagos vencidos de meses anteriores */}
        {overdueItems.length > 0 && (
          <div className={styles.overdueCard}>
            <p className={styles.overdueCardTitle}>⚠️ Pagos pendientes de meses anteriores</p>
            <div className={styles.overduePills}>
              {overdueItems.map(({ item, missedMonths }) => {
                const monthsLabel = missedMonths
                  .map(({ month, year }) =>
                    year === currentYear ? MONTH_NAMES[month - 1] : `${MONTH_NAMES[month - 1]} ${year}`,
                  )
                  .join(', ')
                const symbol = item.currency === Currency.USD ? 'U$S' : '$'
                return (
                  <div
                    key={item.id}
                    className={styles.overduePill}
                    onClick={() => navigate(`/settings/recurring/${item.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/settings/recurring/${item.id}`)}
                  >
                    <div className={styles.overduePillTop}>
                      <span className={styles.overduePillIcon}>{item.icon || '💳'}</span>
                      <span className={styles.overduePillName}>{item.name}</span>
                    </div>
                    <span className={styles.overduePillAmt}>
                      {symbol} {formatCurrency(item.amount, item.currency).replace(/^[^0-9]+/, '')}
                    </span>
                    <span className={styles.overduePillMonths}>Sin pagar: {monthsLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* List with tabs */}
        <div className={styles.desktopListCard}>
          <div className={styles.desktopListHeader}>
            <h3 className={styles.desktopListTitle}>Todos los pagos recurrentes</h3>
            <div className={styles.desktopTabsGroup}>
              <div className={styles.desktopTabs}>
                {(['all', 'auto', 'manual'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={[styles.desktopTab, activeTab === tab ? styles.desktopTabActive : ''].join(' ')}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'all' ? 'Todos' : tab === 'auto' ? 'Automáticos' : 'Manuales'}
                  </button>
                ))}
              </div>
              <div className={styles.desktopTabs}>
                {FREQ_TAB_OPTIONS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={[styles.desktopTab, freqTab === tab.value ? styles.desktopTabActive : ''].join(' ')}
                    onClick={() => setFreqTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredList.length === 0 ? (
            <p className={styles.empty}>No hay pagos recurrentes.</p>
          ) : (
            <div className={styles.desktopList}>
              {groupedFiltered.map(({ catId, items }) => {
                const cat = categories.find((c) => c.id === catId)
                const collapsed = collapsedCats.has(catId)
                const activeItems = items.filter((i) => i.status === RecurringStatus.Active)
                const groupUyu = activeItems.filter((i) => i.currency === Currency.UYU).reduce((s, i) => s + monthlyEquivalent(i), 0)
                const groupUsd = activeItems.filter((i) => i.currency === Currency.USD).reduce((s, i) => s + monthlyEquivalent(i), 0)
                return (
                  <div key={catId} className={styles.desktopGroup}>
                    <button
                      type="button"
                      className={styles.desktopGroupHeader}
                      onClick={() => toggleCat(catId)}
                      aria-expanded={!collapsed}
                    >
                      <span className={[styles.desktopGroupChevron, collapsed ? styles.desktopGroupChevronCollapsed : ''].join(' ')}>
                        ▾
                      </span>
                      <span className={styles.desktopGroupName}>{cat ? cat.name : 'Sin categoría'}</span>
                      <span className={styles.desktopGroupTotals}>
                        {groupUyu > 0 && (
                          <span className={styles.desktopGroupTotal}>{formatCurrency(groupUyu, Currency.UYU)}<span className={styles.desktopGroupTotalUnit}>/mes</span></span>
                        )}
                        {groupUsd > 0 && (
                          <span className={styles.desktopGroupTotal}>U$S {formatCurrency(groupUsd, Currency.USD).replace(/^[^0-9]+/, '')}<span className={styles.desktopGroupTotalUnit}>/mes</span></span>
                        )}
                      </span>
                      <span className={styles.desktopGroupCount}>{items.length}</span>
                    </button>
                    {!collapsed && items.map((item) => (
                      <DesktopRow
                        key={item.id}
                        item={item}
                        cards={cards}
                        onNavigate={(id) => navigate(`/settings/recurring/${id}`)}
                        showModeBadge={activeTab === 'all'}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className={styles.desktopStats}>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>💳 Total mensual · UYU</p>
            <p className={styles.desktopStatValue}>{equivMonthlyUyu > 0 ? formatCurrency(equivMonthlyUyu, Currency.UYU) : '—'}</p>
            <div className={styles.desktopStatSub}>
              <span>{active.filter(r => r.currency === Currency.UYU).length} pagos activos</span>
            </div>
          </div>
          <div className={styles.desktopStatCard}>
            <p className={styles.desktopStatLabel}>💳 Total mensual · USD</p>
            <p className={styles.desktopStatValue}>{equivMonthlyUsd > 0 ? `U$S ${formatCurrency(equivMonthlyUsd, Currency.USD).replace(/^[^0-9]+/, '')}` : '—'}</p>
            <div className={styles.desktopStatSub}>
              <span>{active.filter(r => r.currency === Currency.USD).length} pagos activos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
