// src/features/dashboard/components/DashboardWidgetModal.tsx
//
// Editor del widget GUIADO. Constructor con estado plano (la estructura es
// anidada: bloques → comparaciones, incómoda en Formik). El catálogo GUIDED_SOURCES
// dicta qué campos y comparaciones son válidos por source, así que el editor solo
// ofrece opciones que el motor sabe calcular.

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ControlledSelectInput, type SelectOption } from '@/components/ui/FormField'
import {
  Currency,
  PeriodFilter,
  WidgetEngine,
  WidgetSize,
  GuidedSource,
  GuidedPrimaryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
} from '@/types/enums'
import type { Category, RecurringExpense, DashboardWidget, GuidedBlock, Card, Place } from '@/types/models'
import { useCreateDashboardWidget, useUpdateDashboardWidget } from '../hooks/useDashboardWidgets'
import { GUIDED_SOURCES, COMPARISON_LABELS } from '../guidedCatalog'
import { PERIOD_OPTIONS } from '../periods'
import { buildPreviewContext } from '../previewContext'
import { GuidedWidgetView } from './GuidedWidgetView'
import { EngineChooser } from './EngineChooser'
import { QueryWidgetEditor } from './QueryWidgetEditor'
import { HelpLabel, type HelpContent } from './HelpLabel'
import styles from './DashboardWidgetModal.module.css'

interface DashboardWidgetModalProps {
  onClose: () => void
  categories: Category[]
  recurring: RecurringExpense[]
  cards: Card[]
  places: Place[]
  widget?: DashboardWidget
}

// Dispatcher: al crear muestra el selector de motor; al editar va directo al
// editor del motor del widget.
export function DashboardWidgetModal({
  onClose,
  categories,
  recurring,
  cards,
  places,
  widget,
}: DashboardWidgetModalProps): React.ReactElement {
  const [engine, setEngine] = React.useState<WidgetEngine | null>(widget ? widget.engine : null)
  // Volver al selector de tipo — solo al crear (al editar no hay selector previo).
  const onBack = widget ? undefined : (): void => setEngine(null)

  if (engine === null) {
    return <EngineChooser onClose={onClose} onPick={setEngine} />
  }
  if (engine === WidgetEngine.Query) {
    return (
      <QueryWidgetEditor
        onClose={onClose}
        onBack={onBack}
        widget={widget}
        categories={categories}
        cards={cards}
        places={places}
        recurring={recurring}
      />
    )
  }
  return (
    <GuidedWidgetEditor
      onClose={onClose}
      onBack={onBack}
      widget={widget}
      categories={categories}
      recurring={recurring}
    />
  )
}

const SIZE_OPTIONS: SelectOption[] = [
  { value: WidgetSize.Sm, label: 'Chico (1/3 de fila)' },
  { value: WidgetSize.Md, label: 'Mediano (1/2 de fila)' },
  { value: WidgetSize.Lg, label: 'Ancho (fila completa)' },
]

// En el preview el tamaño se representa como ancho proporcional de la card
// (misma proporción que ocupa en la grilla real del inicio).
const PREVIEW_SIZE_CLASS: Record<WidgetSize, string> = {
  [WidgetSize.Sm]: styles.previewSm,
  [WidgetSize.Md]: styles.previewMd,
  [WidgetSize.Lg]: styles.previewLg,
}
const SIZE_NOTE: Record<WidgetSize, string> = {
  [WidgetSize.Sm]: 'Chico — 1/3 de la fila',
  [WidgetSize.Md]: 'Mediano — 1/2 de la fila',
  [WidgetSize.Lg]: 'Ancho — fila completa',
}

const CURRENCY_OPTS: SelectOption[] = [
  { value: Currency.UYU, label: 'Pesos ($)' },
  { value: Currency.USD, label: 'Dólares (U$S)' },
]

const SOURCE_OPTIONS: SelectOption[] = Object.entries(GUIDED_SOURCES).map(([value, meta]) => ({
  value,
  label: `${meta.icon} ${meta.label}`,
}))

const RENDER_OPTIONS: SelectOption[] = [
  { value: WidgetComparisonRender.Delta, label: 'Variación %' },
  { value: WidgetComparisonRender.Progress, label: 'Barra de progreso' },
]

const ICON_OPTIONS = [
  '📊', '💰', '📈', '🎯', '🔁', '🐜', '🚦', '🧾', '🍔', '🛒',
  '☕', '🎬', '🚌', '🏠', '💊', '🎮', '💡', '⚠️', '✅', '📌',
]

const COLOR_OPTIONS = [
  '#16a34a', '#ef4444', '#f97316', '#f5b732', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#84cc16',
]

interface EditableComparison {
  id: string
  type: WidgetComparisonType
  render: WidgetComparisonRender
  targetValue: string
}

interface EditableBlock {
  id: string
  label: string
  icon: string
  source: GuidedSource
  currency: Currency | ''
  categoryId: string
  recurringId: string
  primaryDisplay: GuidedPrimaryDisplay
  comparisons: EditableComparison[]
}

function uid(): string {
  return crypto.randomUUID()
}

function defaultRender(type: WidgetComparisonType): WidgetComparisonRender {
  return type === WidgetComparisonType.Budget
    ? WidgetComparisonRender.Progress
    : type === WidgetComparisonType.PreviousPeriod
      ? WidgetComparisonRender.Delta
      : WidgetComparisonRender.Progress
}

function emptyBlock(): EditableBlock {
  return {
    id: uid(),
    label: '',
    icon: '',
    source: GuidedSource.TotalSpent,
    currency: Currency.UYU,
    categoryId: '',
    recurringId: '',
    primaryDisplay: GuidedPrimaryDisplay.Number,
    comparisons: [],
  }
}

function blockToEditable(b: GuidedBlock): EditableBlock {
  return {
    id: b.id,
    label: b.label ?? '',
    icon: b.icon ?? '',
    source: b.metric.source,
    currency: b.metric.currency ?? '',
    categoryId: b.metric.categoryId ?? '',
    recurringId: b.metric.recurringId ?? '',
    primaryDisplay: b.primaryDisplay,
    comparisons: b.comparisons.map((c) => ({
      id: uid(),
      type: c.type,
      render: c.render,
      targetValue: c.targetValue != null ? String(c.targetValue) : '',
    })),
  }
}

// Convierte el estado editable → GuidedBlock[] de forma tolerante (sin validar),
// para el previsualizador: los campos incompletos se muestran como "–".
function toPreviewBlocks(blocks: EditableBlock[]): GuidedBlock[] {
  return blocks.map((b) => {
    const meta = GUIDED_SOURCES[b.source]
    return {
      id: b.id,
      label: b.label.trim() || undefined,
      icon: b.icon.trim() || undefined,
      metric: {
        source: b.source,
        currency: meta.needsRecurring ? undefined : (b.currency as Currency) || undefined,
        categoryId: meta.needsCategory ? b.categoryId || undefined : undefined,
        recurringId: meta.needsRecurring ? b.recurringId || undefined : undefined,
      },
      primaryDisplay: b.primaryDisplay,
      comparisons: b.comparisons
        .map((c) => ({
          type: c.type,
          render: c.render,
          targetValue: c.type === WidgetComparisonType.Target ? Number(c.targetValue) : undefined,
        }))
        .filter(
          (c) =>
            c.type !== WidgetComparisonType.Target ||
            (Number.isFinite(c.targetValue) && (c.targetValue as number) > 0),
        ),
    }
  })
}

const HELP: Record<string, HelpContent> = {
  source: [
    { term: 'Total gastado', desc: 'suma de todos los gastos del período.' },
    { term: 'Gasto por categoría', desc: 'total gastado en una categoría (incluye sus subcategorías).' },
    { term: 'Presupuesto restante', desc: 'el presupuesto del mes menos lo que ya gastaste.' },
    { term: 'Total de un recurrente', desc: 'el monto mensual de un pago recurrente puntual.' },
    { term: 'Gastos fijos', desc: 'suma de tus pagos fijos/recurrentes del período.' },
    { term: 'Gastos variables', desc: 'todo lo que gastaste que no es fijo.' },
  ],
  category: 'El gasto se calcula solo para esta categoría (incluye sus subcategorías).',
  recurring: 'Muestra el monto mensual de este pago recurrente.',
  comparisons: [
    { term: 'vs período anterior', desc: 'compara con el período inmediatamente anterior y muestra la variación %.' },
    { term: 'vs presupuesto', desc: 'qué porcentaje del presupuesto de la moneda llevás usado (barra).' },
    { term: 'vs meta', desc: 'compara contra un valor objetivo que definís vos.' },
  ],
}

interface GuidedWidgetEditorProps {
  onClose: () => void
  onBack?: () => void
  categories: Category[]
  recurring: RecurringExpense[]
  widget?: DashboardWidget
}

function GuidedWidgetEditor({
  onClose,
  onBack,
  categories,
  recurring,
  widget,
}: GuidedWidgetEditorProps): React.ReactElement {
  const isEdit = Boolean(widget)
  const { mutateAsync: createWidget, isPending: creating } = useCreateDashboardWidget()
  const { mutateAsync: updateWidget, isPending: updating } = useUpdateDashboardWidget(widget?.id ?? '')

  const [title, setTitle] = React.useState(widget?.title ?? '')
  const [icon, setIcon] = React.useState(widget?.icon ?? '📊')
  const [color, setColor] = React.useState(widget?.color ?? COLOR_OPTIONS[0]!)
  const [size, setSize] = React.useState<WidgetSize>(widget?.size ?? WidgetSize.Sm)
  const [period, setPeriod] = React.useState<PeriodFilter>(widget?.guided?.period ?? PeriodFilter.Month)
  const [blocks, setBlocks] = React.useState<EditableBlock[]>(
    widget?.guided?.blocks?.length ? widget.guided.blocks.map(blockToEditable) : [emptyBlock()],
  )
  const [error, setError] = React.useState<string | null>(null)

  // Previsualización con datos dummy — refleja el estado actual del form.
  const previewBlocks = toPreviewBlocks(blocks)
  const previewCtx = buildPreviewContext(previewBlocks, recurring)

  const categoryOptions: SelectOption[] = categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))
  const recurringOptions: SelectOption[] = recurring.map((r) => ({ value: r.id, label: `${r.icon || '🔁'} ${r.name}` }))

  function patchBlock(id: string, patch: Partial<EditableBlock>): void {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function changeSource(id: string, source: GuidedSource): void {
    const meta = GUIDED_SOURCES[source]
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        return {
          ...b,
          source,
          // Podar comparaciones inválidas para el nuevo source.
          comparisons: b.comparisons.filter((c) => meta.comparisons.includes(c.type)),
          // Reset del display si el nuevo source no soporta sparkline.
          primaryDisplay: meta.allowsSparkline ? b.primaryDisplay : GuidedPrimaryDisplay.Number,
        }
      }),
    )
  }

  function addComparison(blockId: string): void {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b
        const meta = GUIDED_SOURCES[b.source]
        const used = new Set(b.comparisons.map((c) => c.type))
        const next = meta.comparisons.find((t) => !used.has(t))
        if (!next) return b
        return {
          ...b,
          comparisons: [...b.comparisons, { id: uid(), type: next, render: defaultRender(next), targetValue: '' }],
        }
      }),
    )
  }

  function patchComparison(blockId: string, compId: string, patch: Partial<EditableComparison>): void {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id !== blockId
          ? b
          : { ...b, comparisons: b.comparisons.map((c) => (c.id === compId ? { ...c, ...patch } : c)) },
      ),
    )
  }

  function removeComparison(blockId: string, compId: string): void {
    setBlocks((prev) =>
      prev.map((b) => (b.id !== blockId ? b : { ...b, comparisons: b.comparisons.filter((c) => c.id !== compId) })),
    )
  }

  function validateAndBuild(): GuidedBlock[] | null {
    if (title.trim().length < 2) {
      setError('El título es obligatorio (mínimo 2 caracteres).')
      return null
    }
    if (blocks.length === 0) {
      setError('Agregá al menos un bloque.')
      return null
    }
    const out: GuidedBlock[] = []
    for (const b of blocks) {
      const meta = GUIDED_SOURCES[b.source]
      if (meta.needsCurrency && !b.currency) {
        setError(`Elegí una moneda para "${meta.label}".`)
        return null
      }
      if (meta.needsCategory && !b.categoryId) {
        setError(`Elegí una categoría para "${meta.label}".`)
        return null
      }
      if (meta.needsRecurring && !b.recurringId) {
        setError(`Elegí un recurrente para "${meta.label}".`)
        return null
      }
      for (const c of b.comparisons) {
        if (c.type === WidgetComparisonType.Target) {
          const v = Number(c.targetValue)
          if (!Number.isFinite(v) || v <= 0) {
            setError('La meta debe ser un número mayor a 0.')
            return null
          }
        }
      }
      out.push({
        id: b.id,
        label: b.label.trim() || undefined,
        icon: b.icon.trim() || undefined,
        metric: {
          source: b.source,
          currency: meta.needsRecurring ? undefined : (b.currency as Currency) || undefined,
          categoryId: meta.needsCategory ? b.categoryId : undefined,
          recurringId: meta.needsRecurring ? b.recurringId : undefined,
        },
        primaryDisplay: b.primaryDisplay,
        comparisons: b.comparisons.map((c) => ({
          type: c.type,
          render: c.render,
          targetValue: c.type === WidgetComparisonType.Target ? Number(c.targetValue) : undefined,
        })),
      })
    }
    return out
  }

  async function handleSave(): Promise<void> {
    setError(null)
    const built = validateAndBuild()
    if (!built) return
    const guided = { period, blocks: built }
    const iconValue = icon.trim() || undefined
    if (isEdit && widget) {
      await updateWidget({ title: title.trim(), icon: iconValue, color, size, guided })
    } else {
      await createWidget({ title: title.trim(), icon: iconValue, color, size, engine: WidgetEngine.Guided, guided })
    }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar visualizador' : 'Nuevo visualizador · KPI'}
      onClose={onClose}
      onBack={onBack}
      width={940}
    >
      <div className={styles.layout}>
        <div className={styles.formCol}>
        {/* Cabecera del widget */}
        <label className={styles.fieldLabel}>Título</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Gastos del mes"
          maxLength={40}
        />

        <div className={styles.row2}>
          <div>
            <label className={styles.fieldLabel}>Período</label>
            <ControlledSelectInput
              value={period}
              onChange={(v) => setPeriod(v as PeriodFilter)}
              options={PERIOD_OPTIONS}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Tamaño</label>
            <ControlledSelectInput value={size} onChange={(v) => setSize(v as WidgetSize)} options={SIZE_OPTIONS} />
          </div>
        </div>

        {/* Ícono */}
        <label className={styles.fieldLabel}>Ícono</label>
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
          <input
            className={styles.icoCustom}
            value={ICON_OPTIONS.includes(icon) ? '' : icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="✏️"
            aria-label="Emoji personalizado"
            maxLength={2}
          />
        </div>

        {/* Color */}
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
          <input
            type="color"
            className={styles.colorCustom}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Color personalizado"
          />
        </div>

        {/* Bloques */}
        <div className={styles.blocksHeader}>
          <span className={styles.sectionTitle}>Contenido</span>
          <span className={styles.hint}>Agregá uno o más indicadores dentro del widget.</span>
        </div>

        {blocks.map((b, i) => {
          const meta = GUIDED_SOURCES[b.source]
          const usedTypes = new Set(b.comparisons.map((c) => c.type))
          const canAddComparison = meta.comparisons.some((t) => !usedTypes.has(t))
          return (
            <div key={b.id} className={styles.blockCard}>
              <div className={styles.blockCardTop}>
                <span className={styles.blockCardTitle}>Bloque {i + 1}</span>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                  >
                    Quitar
                  </button>
                )}
              </div>

              <HelpLabel label="¿Qué medir?" help={HELP.source} />
              <ControlledSelectInput
                value={b.source}
                onChange={(v) => changeSource(b.id, v as GuidedSource)}
                options={SOURCE_OPTIONS}
              />

              {meta.needsCategory && (
                <>
                  <HelpLabel label="Categoría" help={HELP.category} />
                  <ControlledSelectInput
                    value={b.categoryId}
                    onChange={(v) => patchBlock(b.id, { categoryId: v })}
                    options={categoryOptions}
                    placeholder="Elegí una categoría"
                  />
                </>
              )}

              {meta.needsRecurring && (
                <>
                  <HelpLabel label="Pago recurrente" help={HELP.recurring} />
                  <ControlledSelectInput
                    value={b.recurringId}
                    onChange={(v) => patchBlock(b.id, { recurringId: v })}
                    options={recurringOptions}
                    placeholder="Elegí un recurrente"
                  />
                </>
              )}

              {meta.needsCurrency && (
                <>
                  <label className={styles.fieldLabel}>Moneda</label>
                  <ControlledSelectInput
                    value={b.currency}
                    onChange={(v) => patchBlock(b.id, { currency: v as Currency })}
                    options={CURRENCY_OPTS}
                    placeholder="Elegí una moneda"
                  />
                </>
              )}

              {meta.allowsSparkline && (
                <>
                  <label className={styles.fieldLabel}>Visualización</label>
                  <div className={styles.toggleRow}>
                    <button
                      type="button"
                      className={[styles.toggle, b.primaryDisplay === GuidedPrimaryDisplay.Number ? styles.toggleOn : ''].join(' ')}
                      onClick={() => patchBlock(b.id, { primaryDisplay: GuidedPrimaryDisplay.Number })}
                    >
                      Número
                    </button>
                    <button
                      type="button"
                      className={[styles.toggle, b.primaryDisplay === GuidedPrimaryDisplay.Sparkline ? styles.toggleOn : ''].join(' ')}
                      onClick={() => patchBlock(b.id, { primaryDisplay: GuidedPrimaryDisplay.Sparkline })}
                    >
                      Número + tendencia
                    </button>
                  </div>
                </>
              )}

              {/* Comparaciones */}
              <div className={styles.compSection}>
                <HelpLabel label="Comparaciones" help={HELP.comparisons} />
                {b.comparisons.map((c) => {
                  const typeOptions: SelectOption[] = meta.comparisons
                    .filter((t) => t === c.type || !usedTypes.has(t))
                    .map((t) => ({ value: t, label: COMPARISON_LABELS[t] }))
                  return (
                    <div key={c.id} className={styles.compRow}>
                      <ControlledSelectInput
                        value={c.type}
                        onChange={(v) => {
                          const type = v as WidgetComparisonType
                          patchComparison(b.id, c.id, { type, render: defaultRender(type) })
                        }}
                        options={typeOptions}
                      />
                      {c.type === WidgetComparisonType.Target && (
                        <>
                          <ControlledSelectInput
                            value={c.render}
                            onChange={(v) => patchComparison(b.id, c.id, { render: v as WidgetComparisonRender })}
                            options={RENDER_OPTIONS}
                          />
                          <input
                            className={styles.inputSm}
                            type="number"
                            value={c.targetValue}
                            onChange={(e) => patchComparison(b.id, c.id, { targetValue: e.target.value })}
                            placeholder="Meta"
                          />
                        </>
                      )}
                      <button type="button" className={styles.removeBtn} onClick={() => removeComparison(b.id, c.id)}>
                        ✕
                      </button>
                    </div>
                  )
                })}
                {canAddComparison && (
                  <button type="button" className={styles.addLink} onClick={() => addComparison(b.id)}>
                    ＋ Agregar comparación
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <button type="button" className={styles.addBlockBtn} onClick={() => setBlocks((prev) => [...prev, emptyBlock()])}>
          ＋ Agregar bloque
        </button>

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

        {/* Previsualización en vivo con datos de ejemplo */}
        <div className={styles.previewCol}>
          <span className={styles.previewLabel}>Vista previa</span>
          <GuidedWidgetView
            title={title}
            icon={icon}
            color={color}
            period={period}
            blocks={previewBlocks}
            ctx={previewCtx}
            className={PREVIEW_SIZE_CLASS[size]}
          />
          <span className={styles.previewNote}>
            Datos de ejemplo — así se verá en el inicio.
            <br />
            {SIZE_NOTE[size]}.
          </span>
        </div>
      </div>
    </Modal>
  )
}
