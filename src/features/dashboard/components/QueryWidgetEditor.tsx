// src/features/dashboard/components/QueryWidgetEditor.tsx
//
// Editor del engine QUERY. Constructor de una consulta sobre gastos: filtros,
// agrupación, agregación y visualización. La vista previa usa datos REALES
// (gastos del período elegido) corriendo el mismo runQuery que el HomePage.

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ControlledSelectInput, type SelectOption } from '@/components/ui/FormField'
import {
  Currency,
  PeriodFilter,
  WidgetEngine,
  WidgetSize,
  QueryGroupBy,
  QueryAggregate,
  QueryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
} from '@/types/enums'
import type { Category, Card, Place, DashboardWidget, QueryConfig, QueryFilters, QuerySource, RecurringExpense } from '@/types/models'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCreateDashboardWidget, useUpdateDashboardWidget } from '../hooks/useDashboardWidgets'
import { PERIOD_LABELS, periodRange } from '../periods'
import { runQuery, recurringPaymentsToRecords } from '../queryEngine'
import { QueryWidgetView } from './QueryWidgetView'
import { HelpLabel, type HelpContent } from './HelpLabel'
import styles from './DashboardWidgetModal.module.css'

const HELP: Record<string, HelpContent> = {
  source: [
    { term: 'Gastos', desc: 'consulta sobre tus gastos registrados.' },
    { term: 'Pagos recurrentes', desc: 'usa el historial de pagos de los recurrentes — para ver cómo evoluciona su monto.' },
  ],
  recurring: 'Limitá a un pago recurrente puntual (o dejá "Todos"). Cada período pagado es un punto.',
  period: 'Ventana de tiempo: solo entran los gastos de este período.',
  currency: 'Solo se consideran gastos de esta moneda. Nunca se mezclan USD y UYU.',
  aggregate: [
    { term: 'Suma', desc: 'total de los montos.' },
    { term: 'Cantidad', desc: 'cuántos gastos hay (ignora el monto).' },
    { term: 'Promedio', desc: 'monto promedio por gasto.' },
    { term: 'Mínimo', desc: 'el gasto más chico.' },
    { term: 'Máximo', desc: 'el gasto más grande.' },
  ],
  groupBy: [
    { term: 'Sin agrupar', desc: 'un único valor total (para número o número + meta).' },
    { term: 'Por día/semana/mes', desc: 'una fila/barra por período (útil para líneas y áreas).' },
    { term: 'Por categoría/lugar/tarjeta', desc: 'una fila/barra/porción por cada uno.' },
    { term: 'Por categoría raíz', desc: 'como "por categoría", pero las subcategorías se acumulan bajo su padre.' },
  ],
  display: [
    { term: 'Número', desc: 'un solo valor grande (el total).' },
    { term: 'Número + meta', desc: 'el total con una barra de progreso hacia una meta.' },
    { term: 'Tabla', desc: 'lista de grupos con su valor.' },
    { term: 'Barras / Línea / Área / Torta', desc: 'gráficas sobre los grupos. Necesitan un agrupamiento.' },
  ],
  target: 'Valor objetivo. El total se muestra como porcentaje de esta meta (barra de progreso).',
  category: 'Limita a una categoría (incluye sus subcategorías).',
  card: 'Limita a los gastos hechos con esta tarjeta.',
  place: 'Limita a los gastos de este lugar.',
  search: 'Solo gastos cuya descripción contiene este texto.',
  amountMin: 'Excluye los gastos menores a este monto.',
  amountMax: 'Excluye los gastos mayores a este monto.',
}

const SIZE_OPTIONS: SelectOption[] = [
  { value: WidgetSize.Sm, label: 'Chico (1/3 de fila)' },
  { value: WidgetSize.Md, label: 'Mediano (1/2 de fila)' },
  { value: WidgetSize.Lg, label: 'Ancho (fila completa)' },
]
const PREVIEW_SIZE_CLASS: Record<WidgetSize, string> = {
  [WidgetSize.Sm]: styles.previewSm,
  [WidgetSize.Md]: styles.previewMd,
  [WidgetSize.Lg]: styles.previewLg,
}

const ICON_OPTIONS = ['📊', '📈', '🥧', '🗂️', '💰', '🐜', '🏷️', '🧾', '🍔', '🛒', '☕', '🚌', '🏠', '💊', '🎮', '💡']
const COLOR_OPTIONS = ['#16a34a', '#ef4444', '#f97316', '#f5b732', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#84cc16']

// Solo períodos que el backend de gastos scopea bien.
const PERIOD_OPTIONS: SelectOption[] = [
  PeriodFilter.Month,
  PeriodFilter.SevenDays,
  PeriodFilter.ThreeMonths,
  PeriodFilter.Year,
  PeriodFilter.All,
].map((p) => ({ value: p, label: PERIOD_LABELS[p] }))

const CURRENCY_OPTS: SelectOption[] = [
  { value: Currency.UYU, label: 'Pesos ($)' },
  { value: Currency.USD, label: 'Dólares (U$S)' },
]

const SOURCE_OPTIONS: SelectOption[] = [
  { value: 'expenses', label: 'Gastos' },
  { value: 'recurring', label: 'Pagos recurrentes' },
]

const GROUPBY_OPTIONS: SelectOption[] = [
  { value: QueryGroupBy.None, label: 'Sin agrupar' },
  { value: QueryGroupBy.Day, label: 'Por día' },
  { value: QueryGroupBy.Week, label: 'Por semana' },
  { value: QueryGroupBy.Month, label: 'Por mes' },
  { value: QueryGroupBy.Category, label: 'Por categoría' },
  { value: QueryGroupBy.CategoryRoot, label: 'Por categoría raíz' },
  { value: QueryGroupBy.Place, label: 'Por lugar' },
  { value: QueryGroupBy.Card, label: 'Por tarjeta' },
]

const AGGREGATE_OPTIONS: SelectOption[] = [
  { value: QueryAggregate.Sum, label: 'Suma' },
  { value: QueryAggregate.Count, label: 'Cantidad' },
  { value: QueryAggregate.Avg, label: 'Promedio' },
  { value: QueryAggregate.Min, label: 'Mínimo' },
  { value: QueryAggregate.Max, label: 'Máximo' },
]

const DISPLAY_OPTIONS: SelectOption[] = [
  { value: QueryDisplay.Value, label: 'Número' },
  { value: QueryDisplay.ValueDelta, label: 'Número + meta' },
  { value: QueryDisplay.Table, label: 'Tabla' },
  { value: QueryDisplay.Bar, label: 'Gráfica de barras' },
  { value: QueryDisplay.Line, label: 'Gráfica de línea' },
  { value: QueryDisplay.Area, label: 'Gráfica de área' },
  { value: QueryDisplay.Pie, label: 'Gráfica de torta' },
]

const GROUPED_DISPLAYS = [QueryDisplay.Table, QueryDisplay.Bar, QueryDisplay.Line, QueryDisplay.Area, QueryDisplay.Pie]
function isGrouped(d: QueryDisplay): boolean {
  return GROUPED_DISPLAYS.includes(d)
}

interface QueryWidgetEditorProps {
  onClose: () => void
  onBack?: () => void
  categories: Category[]
  cards: Card[]
  places: Place[]
  recurring: RecurringExpense[]
  widget?: DashboardWidget
}

export function QueryWidgetEditor({
  onClose,
  onBack,
  categories,
  cards,
  places,
  recurring,
  widget,
}: QueryWidgetEditorProps): React.ReactElement {
  const isEdit = Boolean(widget)
  const { mutateAsync: createWidget, isPending: creating } = useCreateDashboardWidget()
  const { mutateAsync: updateWidget, isPending: updating } = useUpdateDashboardWidget(widget?.id ?? '')

  const q = widget?.query
  const [source, setSource] = React.useState<QuerySource>(q?.source ?? 'expenses')
  const [recurringId, setRecurringId] = React.useState(q?.filters.recurringId ?? '')
  const [title, setTitle] = React.useState(widget?.title ?? '')
  const [icon, setIcon] = React.useState(widget?.icon ?? '📊')
  const [color, setColor] = React.useState(widget?.color ?? COLOR_OPTIONS[0]!)
  const [size, setSize] = React.useState<WidgetSize>(widget?.size ?? WidgetSize.Md)
  const [period, setPeriod] = React.useState<PeriodFilter>(q?.period ?? PeriodFilter.Month)
  const [currency, setCurrency] = React.useState<Currency>(q?.currency ?? Currency.UYU)
  const [categoryId, setCategoryId] = React.useState(q?.filters.categoryIds?.[0] ?? '')
  const [cardId, setCardId] = React.useState(q?.filters.cardId ?? '')
  const [placeId, setPlaceId] = React.useState(q?.filters.placeId ?? '')
  const [search, setSearch] = React.useState(q?.filters.search ?? '')
  const [amountMin, setAmountMin] = React.useState(q?.filters.amountMin != null ? String(q.filters.amountMin) : '')
  const [amountMax, setAmountMax] = React.useState(q?.filters.amountMax != null ? String(q.filters.amountMax) : '')
  const [groupBy, setGroupBy] = React.useState<QueryGroupBy>(q?.groupBy ?? QueryGroupBy.Category)
  const [aggregate, setAggregate] = React.useState<QueryAggregate>(q?.aggregate ?? QueryAggregate.Sum)
  const [display, setDisplay] = React.useState<QueryDisplay>(q?.display ?? QueryDisplay.Bar)
  const [targetValue, setTargetValue] = React.useState(
    q?.comparison?.type === WidgetComparisonType.Target && q.comparison.targetValue != null
      ? String(q.comparison.targetValue)
      : '',
  )
  const [error, setError] = React.useState<string | null>(null)

  // Datos reales para la vista previa. Traemos todos los gastos; el motor filtra por
  // el rango del período (alineado a mes calendario) — el fetch no corta el mes borde.
  const { data: expensesPage, isLoading: loadingExpenses } = useExpenses()
  const expenses = expensesPage?.data ?? []

  const categoryOptions: SelectOption[] = categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))
  const cardOptions: SelectOption[] = cards.map((c) => ({ value: c.id, label: `${c.bank}${c.lastFour ? ` ••${c.lastFour}` : ''}` }))
  const placeOptions: SelectOption[] = places.map((p) => ({ value: p.id, label: p.name }))
  const recurringOptions: SelectOption[] = recurring.map((r) => ({ value: r.id, label: `${r.icon || '🔁'} ${r.name}` }))

  const isRecurring = source === 'recurring'

  // Al pasar a recurrentes, default útil: evolución mensual como línea.
  function changeSource(next: QuerySource): void {
    setSource(next)
    if (next === 'recurring') {
      setGroupBy(QueryGroupBy.Month)
      setDisplay(QueryDisplay.Line)
      setPlaceId('') // los recurrentes no tienen lugar
    }
  }

  function buildFilters(): QueryFilters {
    return {
      categoryIds: categoryId ? [categoryId] : undefined,
      cardId: cardId || undefined,
      placeId: isRecurring ? undefined : placeId || undefined,
      search: search.trim() || undefined,
      amountMin: amountMin !== '' && Number.isFinite(Number(amountMin)) ? Number(amountMin) : undefined,
      amountMax: amountMax !== '' && Number.isFinite(Number(amountMax)) ? Number(amountMax) : undefined,
      recurringId: isRecurring && recurringId ? recurringId : undefined,
    }
  }

  function buildConfig(): QueryConfig {
    const t = Number(targetValue)
    const comparison =
      display === QueryDisplay.ValueDelta && targetValue !== '' && Number.isFinite(t) && t > 0
        ? { type: WidgetComparisonType.Target, render: WidgetComparisonRender.Progress, targetValue: t }
        : undefined
    return {
      source,
      currency,
      period,
      filters: buildFilters(),
      groupBy,
      aggregate,
      comparison,
      display,
    }
  }

  const previewConfig = buildConfig()
  const previewNow = new Date()
  const previewRange = periodRange(period, previewNow)
  const previewRecords = isRecurring
    ? recurringPaymentsToRecords(recurring, recurringId || undefined, previewRange)
    : expenses
  const previewResult = runQuery(previewConfig, previewRecords, { categories, cards, places }, previewNow, previewRange)

  async function handleSave(): Promise<void> {
    setError(null)
    if (title.trim().length < 2) {
      setError('El título es obligatorio (mínimo 2 caracteres).')
      return
    }
    if (isGrouped(display) && groupBy === QueryGroupBy.None) {
      setError('Ese tipo de visualización necesita un agrupamiento. Elegí "Agrupar por".')
      return
    }
    const query = buildConfig()
    const iconValue = icon.trim() || undefined
    if (isEdit && widget) {
      await updateWidget({ title: title.trim(), icon: iconValue, color, size, query })
    } else {
      await createWidget({ title: title.trim(), icon: iconValue, color, size, engine: WidgetEngine.Query, query })
    }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar visualizador' : 'Nuevo visualizador · Query'}
      onClose={onClose}
      onBack={onBack}
      width={940}
    >
      <div className={styles.layout}>
        <div className={styles.formCol}>
          {/* Cabecera */}
          <label className={styles.fieldLabel}>Título</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Gasto por categoría"
            maxLength={40}
          />

          <div className={styles.row2}>
            <div>
              <HelpLabel label="Período" help={HELP.period} />
              <ControlledSelectInput value={period} onChange={(v) => setPeriod(v as PeriodFilter)} options={PERIOD_OPTIONS} />
            </div>
            <div>
              <HelpLabel label="Moneda" help={HELP.currency} />
              <ControlledSelectInput value={currency} onChange={(v) => setCurrency(v as Currency)} options={CURRENCY_OPTS} />
            </div>
          </div>

          <div className={styles.row2}>
            <div>
              <label className={styles.fieldLabel}>Tamaño</label>
              <ControlledSelectInput value={size} onChange={(v) => setSize(v as WidgetSize)} options={SIZE_OPTIONS} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Ícono</label>
              <input
                className={styles.input}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📊"
                maxLength={2}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>

          <label className={styles.fieldLabel}>Ícono sugerido</label>
          <div className={styles.iconPicker} role="group" aria-label="Seleccionar ícono">
            {ICON_OPTIONS.map((ico) => (
              <button
                key={ico}
                type="button"
                className={[styles.icoBtn, icon === ico ? styles.icoBtnActive : ''].join(' ')}
                onClick={() => setIcon(ico)}
                aria-label={ico}
                aria-pressed={icon === ico}
              >
                {ico}
              </button>
            ))}
          </div>

          <label className={styles.fieldLabel}>Color</label>
          <div className={styles.colorPicker} role="group" aria-label="Seleccionar color">
            {COLOR_OPTIONS.map((col) => (
              <button
                key={col}
                type="button"
                className={[styles.colorBtn, color === col ? styles.colorBtnActive : ''].join(' ')}
                style={{ background: col, '--swatch-color': col } as React.CSSProperties}
                onClick={() => setColor(col)}
                aria-label={col}
                aria-pressed={color === col}
              />
            ))}
            <input type="color" className={styles.colorCustom} value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color personalizado" />
          </div>

          {/* Consulta */}
          <div className={styles.blocksHeader}>
            <span className={styles.sectionTitle}>Consulta</span>
          </div>

          <div className={styles.row2}>
            <div>
              <HelpLabel label="Fuente" help={HELP.source} />
              <ControlledSelectInput value={source} onChange={(v) => changeSource(v as QuerySource)} options={SOURCE_OPTIONS} />
            </div>
            {isRecurring && (
              <div>
                <HelpLabel label="Recurrente" help={HELP.recurring} />
                <ControlledSelectInput
                  value={recurringId}
                  onChange={setRecurringId}
                  options={recurringOptions}
                  placeholder="Todos"
                />
              </div>
            )}
          </div>

          <div className={styles.row2}>
            <div>
              <HelpLabel label="Métrica" help={HELP.aggregate} />
              <ControlledSelectInput value={aggregate} onChange={(v) => setAggregate(v as QueryAggregate)} options={AGGREGATE_OPTIONS} />
            </div>
            <div>
              <HelpLabel label="Agrupar por" help={HELP.groupBy} />
              <ControlledSelectInput value={groupBy} onChange={(v) => setGroupBy(v as QueryGroupBy)} options={GROUPBY_OPTIONS} />
            </div>
          </div>

          <HelpLabel label="Visualización" help={HELP.display} />
          <ControlledSelectInput value={display} onChange={(v) => setDisplay(v as QueryDisplay)} options={DISPLAY_OPTIONS} />

          {display === QueryDisplay.ValueDelta && (
            <>
              <HelpLabel label="Meta (opcional)" help={HELP.target} />
              <input
                className={styles.input}
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Ej: 20000"
              />
            </>
          )}

          {/* Filtros */}
          <div className={styles.blocksHeader}>
            <span className={styles.sectionTitle}>Filtros</span>
            <span className={styles.hint}>Todos opcionales. Se combinan con Y.</span>
          </div>

          <div className={styles.row2}>
            <div>
              <HelpLabel label="Categoría" help={HELP.category} />
              <ControlledSelectInput value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="Todas" />
            </div>
            <div>
              <HelpLabel label="Tarjeta" help={HELP.card} />
              <ControlledSelectInput value={cardId} onChange={setCardId} options={cardOptions} placeholder="Todas" />
            </div>
          </div>

          <div className={styles.row2}>
            {!isRecurring && (
              <div>
                <HelpLabel label="Lugar" help={HELP.place} />
                <ControlledSelectInput value={placeId} onChange={setPlaceId} options={placeOptions} placeholder="Todos" />
              </div>
            )}
            <div>
              <HelpLabel label="Descripción contiene" help={HELP.search} />
              <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="texto…" />
            </div>
          </div>

          <div className={styles.row2}>
            <div>
              <HelpLabel label="Monto mínimo" help={HELP.amountMin} />
              <input className={styles.input} type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="0" />
            </div>
            <div>
              <HelpLabel label="Monto máximo" help={HELP.amountMax} />
              <input className={styles.input} type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="sin límite" />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" loading={creating || updating} onClick={() => void handleSave()}>
              {isEdit ? 'Guardar cambios' : 'Crear visualizador'}
            </Button>
          </div>
        </div>

        {/* Vista previa con datos reales */}
        <div className={styles.previewCol}>
          <span className={styles.previewLabel}>Vista previa</span>
          <QueryWidgetView
            title={title}
            icon={icon}
            color={color}
            period={period}
            config={previewConfig}
            result={previewResult}
            className={PREVIEW_SIZE_CLASS[size]}
          />
          <span className={styles.previewNote}>
            {isRecurring
              ? `Historial de pagos · ${PERIOD_LABELS[period]}.`
              : loadingExpenses
                ? 'Cargando gastos…'
                : `Datos reales de: ${PERIOD_LABELS[period]}.`}
          </span>
        </div>
      </div>
    </Modal>
  )
}
