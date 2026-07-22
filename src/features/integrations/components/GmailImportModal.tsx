// src/features/integrations/components/GmailImportModal.tsx
//
// Modal de revisión de gastos importados desde Gmail. Reusa la tabla compartida
// (ImportReviewTable) y el CSS del modal de estado de cuenta; cambia la fuente
// (cola de pendientes en vez de PDF) y el guardado (importedFrom: 'gmail').
//
// Tres estados por fila:
//   ✅ tildada + Guardar → se crea el gasto y se saca de la cola
//   ⬜ sin tildar + cerrar → queda pendiente (reaparece en la próxima sync)
//   🗑️ descartar → se saca de la cola sin crear gasto (no reaparece: sigue "visto")

import React, { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { expensesService } from '@/services/expensesService'
import { integrationsService } from '@/services/integrationsService'
import { findBestDuplicate } from '@/services/statementService'
import { useCards } from '@/features/cards/hooks/useCards'
import { useCategories, useCreateCategory } from '@/features/categories/hooks/useCategories'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useGmailQueue, GMAIL_QUEUE_KEY } from '@/features/integrations/hooks/useGmailIntegration'
import { ImportReviewTable } from '@/features/statements/components/ImportReviewTable'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cardLabel } from '@/features/cards/cardUtils'
import { StatementImportAction, Currency } from '@/types/enums'
import type { Category, Expense, GmailPendingItem, GmailQueue, StatementImportRow } from '@/types/models'
import { formatAmount } from '@/utils/formatCurrency'
import styles from './GmailImportModal.module.css'

/** Mapea los pendientes de la cola a filas de la tabla (rowId = id del mail). */
function buildRows(
  pending: GmailPendingItem[],
  defaultCardId: string,
  categories: Category[],
  existingExpenses: Expense[],
): StatementImportRow[] {
  return pending.map((p) => {
    const matched = p.suggestedCategoryName
      ? categories.find(
          (c) =>
            c.name.toLowerCase().includes(p.suggestedCategoryName!.toLowerCase()) ||
            p.suggestedCategoryName!.toLowerCase().includes(c.name.toLowerCase()),
        )
      : undefined
    // Dedup contra gastos ya registrados (mismo monto+moneda, fecha ±2d, desc difusa).
    const dup = findBestDuplicate(p, existingExpenses)
    return {
      date: p.date,
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      suggestedCategoryName: p.suggestedCategoryName,
      rowId: p.gmailMessageId, // el rowId ES el id del mail → sirve para sacarlo de la cola
      // Un posible duplicado arranca SIN tildar para no re-crear el gasto por accidente.
      action: dup ? StatementImportAction.Skip : StatementImportAction.Import,
      cardId: defaultCardId,
      categoryId: matched?.id,
      ...(dup ? { matchedExpenseId: dup.expenseId, matchScore: dup.score } : {}),
    }
  })
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Mientras es true, el modal muestra "Descargando emails…" y no se puede cerrar. */
  syncing?: boolean
}

export function GmailImportModal({ isOpen, onClose, syncing = false }: Props): React.ReactElement | null {
  const qc = useQueryClient()
  const queue = useGmailQueue()
  const { data: cards = [] } = useCards()
  const { data: categories = [] } = useCategories()
  const { data: places = [] } = usePlaces()
  const { data: expensesPage, isSuccess: expensesReady } = useExpenses()
  const { data: userPrefs } = useUserPrefs()
  const createCategory = useCreateCategory()

  const existingExpenses = expensesPage?.data ?? []

  const defaultCardId = userPrefs?.defaultCardId ?? cards[0]?.id ?? ''
  const [selectedCardId, setSelectedCardId] = useState('')
  const [rows, setRows] = useState<StatementImportRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pending = queue.data?.pending

  // (Re)cargar las filas cuando abre el modal, llega la cola, o cargan los gastos
  // (para aplicar el dedup una vez que existingExpenses está disponible).
  useEffect(() => {
    if (!isOpen || !pending) return
    const card = selectedCardId || defaultCardId
    setRows(buildRows(pending, card, categories, existingExpenses))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pending, expensesReady])

  const handleClose = useCallback(() => {
    setError(null)
    setSaving(false)
    onClose()
  }, [onClose])

  const updateRow = useCallback((rowId: string, patch: Partial<StatementImportRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }, [])

  const toggleAll = useCallback(() => {
    setRows((prev) => {
      const allImport = prev.length > 0 && prev.every((r) => r.action === StatementImportAction.Import)
      const next = allImport ? StatementImportAction.Skip : StatementImportAction.Import
      return prev.map((r) => ({ ...r, action: next }))
    })
  }, [])

  // Descartar: saca de la cola (queda "visto", no reaparece) sin crear gasto.
  const discardRow = useCallback(
    async (rowId: string) => {
      setRows((prev) => prev.filter((r) => r.rowId !== rowId))
      try {
        const updated = await integrationsService.removeGmailPending([rowId])
        qc.setQueryData<GmailQueue>(GMAIL_QUEUE_KEY, updated)
      } catch {
        /* no bloqueante: se quitó de la vista; se puede reintentar en otra sync */
      }
    },
    [qc],
  )

  const applySuggestion = useCallback(
    async (rowId: string, suggestedName: string) => {
      const match = categories.find(
        (c) =>
          c.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
          suggestedName.toLowerCase().includes(c.name.toLowerCase()),
      )
      if (match) {
        updateRow(rowId, { categoryId: match.id })
        return
      }
      try {
        const created = await createCategory.mutateAsync({
          name: suggestedName,
          icon: '🏷️',
          color: 'var(--g500)',
          active: true,
        })
        updateRow(rowId, { categoryId: created.id })
      } catch (err) {
        setError((err as Error).message ?? 'No se pudo crear la categoría sugerida')
      }
    },
    [categories, createCategory, updateRow],
  )

  const handleSave = useCallback(async () => {
    const toImport = rows.filter((r) => r.action === StatementImportAction.Import)
    if (toImport.length === 0) {
      handleClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payloads = toImport.map((r) => ({
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        cardId: r.cardId ?? selectedCardId ?? defaultCardId,
        categoryIds: r.categoryId ? [r.categoryId] : [],
        placeId: r.placeId,
        date: r.date,
        importedFrom: 'gmail' as const,
        gmailMessageId: r.rowId,
      }))
      await expensesService.createBatch(payloads)

      const updated = await integrationsService.removeGmailPending(toImport.map((r) => r.rowId))
      qc.setQueryData<GmailQueue>(GMAIL_QUEUE_KEY, updated)
      void qc.invalidateQueries({ queryKey: ['expenses'] })
      handleClose()
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar los gastos')
      setSaving(false)
    }
  }, [rows, selectedCardId, defaultCardId, qc, handleClose])

  if (!isOpen) return null

  const importCount = rows.filter((r) => r.action === StatementImportAction.Import).length
  const allSelected = rows.length > 0 && importCount === rows.length
  const someSelected = importCount > 0 && importCount < rows.length

  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + (Number.isFinite(r.amount) ? r.amount : 0)
    return acc
  }, {})
  const currencies = Object.keys(totals) as Currency[]

  return (
    <Modal
      title={syncing ? 'Sincronizando Gmail' : 'Revisar gastos de Gmail'}
      onClose={handleClose}
      width={880}
      dismissible={!syncing}
    >
      <div className={styles.body}>
        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        {syncing ? (
          <div className={styles.processing}>
            <div className={styles.processingIcon}>📥</div>
            <div className={styles.spinner} />
            <div className={styles.processingTitle}>Descargando emails…</div>
            <div className={styles.processingHint}>
              Trayendo los avisos de compra y analizándolos con IA. Puede demorar unos segundos.
            </div>
          </div>
        ) : queue.isLoading ? (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <div className={styles.processingTitle}>Cargando pendientes…</div>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.processing}>
            <div className={styles.processingIcon}>📭</div>
            <div className={styles.processingTitle}>No hay gastos pendientes de Gmail</div>
            <div className={styles.processingHint}>
              Sincronizá desde Integraciones para traer nuevos avisos de compra.
            </div>
          </div>
        ) : (
          <>
            <div className={styles.reviewHeader}>
              <span className={styles.reviewTitle}>Revisá y editá los gastos antes de guardar</span>
              <select
                className={styles.select}
                value={selectedCardId || defaultCardId}
                onChange={(e) => {
                  setSelectedCardId(e.target.value)
                  setRows((prev) => prev.map((r) => ({ ...r, cardId: e.target.value })))
                }}
              >
                <option value="">Sin tarjeta asignada</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{cardLabel(c)}</option>
                ))}
              </select>
            </div>
            <span className={styles.reviewCount}>{importCount} de {rows.length} a importar</span>

            <ImportReviewTable
              rows={rows}
              categories={categories}
              places={places}
              allSelected={allSelected}
              someSelected={someSelected}
              createCategoryPending={createCategory.isPending}
              onToggleAll={toggleAll}
              onUpdateRow={updateRow}
              onRemoveRow={(rowId) => void discardRow(rowId)}
              onApplySuggestion={applySuggestion}
              removeTitle="Descartar (no crear gasto, no volver a mostrar)"
            />
          </>
        )}
      </div>

      {!syncing && rows.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.invoiceTotal}>
            <span className={styles.invoiceTotalLabel}>Total seleccionado</span>
            <div className={styles.invoiceTotalAmounts}>
              {currencies.length === 0 ? (
                <span className={styles.invoiceTotalAmount}>—</span>
              ) : (
                currencies.map((cur) => (
                  <span key={cur} className={styles.invoiceTotalAmount}>
                    {formatAmount(totals[cur], cur)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              Cerrar
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={saving || importCount === 0}
            >
              {importCount === 0
                ? 'Sin gastos seleccionados'
                : `Guardar ${importCount} gasto${importCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
