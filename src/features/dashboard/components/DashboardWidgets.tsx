// src/features/dashboard/components/DashboardWidgets.tsx
//
// Grilla de "visualizadores" del inicio (debajo de los totales por moneda).
// Dos motores: GUIADO (derivado de MetricsSummary) y QUERY (runQuery sobre gastos).
// Cada widget pide sus propios datos según su período; los valores se calculan al
// vuelo — solo se persiste la configuración.
//
// Reorden: drag&drop con el patrón DragOverlay de dnd-kit (la card arrastrada se
// dibuja en un overlay a tamaño natural, el slot original queda atenuado). Los
// transforms de reacomodo son solo-translate (sin scaleX/scaleY) para que ni el
// ítem ni los vecinos se estiren con los tamaños variables (sm/md/lg). Fallback:
// botones "Mover ← / →" del menú.

import React from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { KebabMenu, type KebabMenuItem } from '@/components/shared/KebabMenu'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { WidgetEngine, WidgetSize, LocaleFilterPeriod } from '@/types/enums'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useRecurringList } from '@/features/recurring/hooks/useRecurring'
import { useCards } from '@/features/cards/hooks/useCards'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import type { DashboardWidget, BudgetSettings, RecurringExpense, Category, Card, Place } from '@/types/models'
import {
  useDashboardWidgets,
  useDeleteDashboardWidget,
  useReorderDashboardWidgets,
} from '../hooks/useDashboardWidgets'
import { runQuery, recurringPaymentsToRecords } from '../queryEngine'
import { periodRange } from '../periods'
import { GuidedWidgetView } from './GuidedWidgetView'
import { QueryWidgetView } from './QueryWidgetView'
import { DashboardWidgetModal } from './DashboardWidgetModal'
import styles from './DashboardWidgets.module.css'

const SIZE_CLASS: Record<WidgetSize, string> = {
  [WidgetSize.Sm]: styles.sizeSm,
  [WidgetSize.Md]: styles.sizeMd,
  [WidgetSize.Lg]: styles.sizeLg,
}

interface Lookups {
  categories: Category[]
  cards: Card[]
  places: Place[]
}

function LoadingCard(): React.ReactElement {
  return (
    <div className={styles.loadingCard}>
      <LoadingSpinner />
    </div>
  )
}

function GuidedWidgetCard({
  widget,
  budget,
  recurring,
  action,
  dragHandle,
}: {
  widget: DashboardWidget
  budget: BudgetSettings | undefined
  recurring: RecurringExpense[]
  action?: React.ReactNode
  dragHandle?: React.ReactNode
}): React.ReactElement {
  const period = widget.guided?.period
  const { data: metrics, isLoading } = useMetrics(period)

  if (isLoading || !metrics) return <LoadingCard />

  return (
    <GuidedWidgetView
      title={widget.title}
      icon={widget.icon}
      color={widget.color}
      period={period}
      blocks={widget.guided?.blocks ?? []}
      ctx={{ metrics, budget, recurring }}
      dragHandle={dragHandle}
      action={action}
    />
  )
}

function QueryWidgetCard({
  widget,
  lookups,
  recurring,
  action,
  dragHandle,
}: {
  widget: DashboardWidget
  lookups: Lookups
  recurring: RecurringExpense[]
  action?: React.ReactNode
  dragHandle?: React.ReactNode
}): React.ReactElement {
  const cfg = widget.query
  // Traemos todos los gastos y el motor filtra por el rango del período (alineado a
  // mes calendario). Así el fetch no corta el mes del borde (ej. principios de abril).
  const { data: expensesPage, isLoading } = useExpenses()

  if (!cfg) return <LoadingCard />
  if (cfg.source === 'expenses' && isLoading) return <LoadingCard />

  const now = new Date()
  const range = periodRange(cfg.period, now)
  const records =
    cfg.source === 'recurring'
      ? recurringPaymentsToRecords(recurring, cfg.filters.recurringId, range)
      : (expensesPage?.data ?? [])
  const result = runQuery(cfg, records, lookups, now, range)
  return (
    <QueryWidgetView
      title={widget.title}
      icon={widget.icon}
      color={widget.color}
      period={cfg.period}
      config={cfg}
      result={result}
      dragHandle={dragHandle}
      action={action}
    />
  )
}

function WidgetCard({
  widget,
  budget,
  recurring,
  lookups,
  action,
  dragHandle,
}: {
  widget: DashboardWidget
  budget: BudgetSettings | undefined
  recurring: RecurringExpense[]
  lookups: Lookups
  action?: React.ReactNode
  dragHandle?: React.ReactNode
}): React.ReactElement {
  return widget.engine === WidgetEngine.Query ? (
    <QueryWidgetCard widget={widget} lookups={lookups} recurring={recurring} action={action} dragHandle={dragHandle} />
  ) : (
    <GuidedWidgetCard widget={widget} budget={budget} recurring={recurring} action={action} dragHandle={dragHandle} />
  )
}

// Ítem sortable: reserva el slot (mantiene el span), provee la manija y aplica un
// transform solo-translate. Mientras se arrastra, atenúa el slot (el overlay
// muestra la card real siguiendo el puntero).
function SortableWidget({
  id,
  sizeClass,
  children,
}: {
  id: string
  sizeClass: string
  children: (dragHandle: React.ReactNode) => React.ReactNode
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style: React.CSSProperties = {
    // Solo translate — descartamos scaleX/scaleY para no estirar con tamaños variables.
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  }
  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className={styles.dragHandle}
      aria-label="Arrastrar para reordenar"
      {...attributes}
      {...listeners}
    >
      ⠿
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[sizeClass, isDragging ? styles.dragging : ''].join(' ')}
    >
      {children(handle)}
    </div>
  )
}

export function DashboardWidgets(): React.ReactElement {
  const { data: widgets = [] } = useDashboardWidgets()
  const { data: budget } = useBudget()
  const { data: recurring = [] } = useRecurringList()
  const { data: categories = [] } = useCategories()
  const { data: cards = [] } = useCards()
  const { data: places = [] } = usePlaces(LocaleFilterPeriod.AllTime)
  const { mutate: deleteWidget } = useDeleteDashboardWidget()
  const { mutate: reorder } = useReorderDashboardWidgets()

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DashboardWidget | null>(null)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const lookups: Lookups = { categories: categories as Category[], cards, places }
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : undefined

  function openCreate(): void {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(widget: DashboardWidget): void {
    setEditing(widget)
    setModalOpen(true)
  }
  function handleDelete(widget: DashboardWidget): void {
    if (window.confirm(`¿Eliminar el visualizador "${widget.title}"?`)) {
      deleteWidget(widget.id)
    }
  }
  function persistOrder(ordered: DashboardWidget[]): void {
    reorder(ordered.map((w, i) => ({ id: w.id, position: i })))
  }
  // Fallback por teclado/menú: intercambia con el vecino.
  function move(index: number, dir: -1 | 1): void {
    const target = index + dir
    if (target < 0 || target >= widgets.length) return
    persistOrder(arrayMove(widgets, index, target))
  }
  function onDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id))
  }
  function onDragEnd(event: DragEndEvent): void {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = widgets.findIndex((w) => w.id === active.id)
    const newIndex = widgets.findIndex((w) => w.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    persistOrder(arrayMove(widgets, oldIndex, newIndex))
  }

  return (
    <div className={styles.section}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className={styles.grid}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            {widgets.map((w, i) => {
              const sizeClass = w.size ? SIZE_CLASS[w.size] : ''
              const menuItems: KebabMenuItem[] = [
                { label: 'Mover ←', icon: '←', onClick: () => move(i, -1), disabled: i === 0 },
                { label: 'Mover →', icon: '→', onClick: () => move(i, 1), disabled: i === widgets.length - 1 },
                { label: 'Editar', icon: '✏️', onClick: () => openEdit(w) },
                { label: 'Eliminar', icon: '🗑️', onClick: () => handleDelete(w), danger: true },
              ]
              return (
                <SortableWidget key={w.id} id={w.id} sizeClass={sizeClass}>
                  {(dragHandle) => (
                    <WidgetCard
                      widget={w}
                      budget={budget}
                      recurring={recurring}
                      lookups={lookups}
                      dragHandle={dragHandle}
                      action={<KebabMenu items={menuItems} ariaLabel={`Acciones de ${w.title}`} />}
                    />
                  )}
                </SortableWidget>
              )
            })}
          </SortableContext>
          <button className={styles.addCard} onClick={openCreate} type="button">
            <span className={styles.addIcon}>＋</span>
            <span className={styles.addLabel}>Agregar visualizador</span>
          </button>
        </div>

        <DragOverlay>
          {activeWidget ? (
            <div className={styles.overlayCard}>
              <WidgetCard
                widget={activeWidget}
                budget={budget}
                recurring={recurring}
                lookups={lookups}
                dragHandle={
                  <span className={styles.dragHandle} aria-hidden>
                    ⠿
                  </span>
                }
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen && (
        <DashboardWidgetModal
          onClose={() => setModalOpen(false)}
          categories={categories as Category[]}
          recurring={recurring}
          cards={cards}
          places={places}
          widget={editing ?? undefined}
        />
      )}
    </div>
  )
}
