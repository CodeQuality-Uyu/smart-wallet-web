// src/features/statements/components/StatementImportModal.tsx

import React, { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { parsePdf, parsePdfFromUrl, detectDuplicates } from '@/services/statementService'
import { expensesService } from '@/services/expensesService'
import { buildInstallmentPayloads } from '@/features/expenses/installments'
import { reportAttachmentsService } from '@/services/reportAttachmentsService'
import { useCreateCategory } from '@/features/categories/hooks/useCategories'
import { RecurringFormModal } from '@/features/recurring/components/RecurringFormModal'
import type { RecurringFormValues } from '@/features/recurring/schemas/recurringSchema'
import { ImportReviewTable } from './ImportReviewTable'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { StatementImportAction } from '@/types/enums'
import type { Card, Category, Place, Expense, ReportAttachment, StatementImportRow } from '@/types/models'
import { cardLabel } from '@/features/cards/cardUtils'
import { Currency } from '@/types/enums'
import { formatAmount } from '@/utils/formatCurrency'
import styles from './StatementImportModal.module.css'

type Step = 'setup' | 'uploading' | 'processing' | 'reviewing' | 'saving'

interface Props {
  isOpen: boolean
  onClose: () => void
  yearMonth: string
  cards: Card[]
  categories: Category[]
  places: Place[]
  existingExpenses: Expense[]
  existingAttachment?: ReportAttachment
}

export function StatementImportModal({
  isOpen,
  onClose,
  yearMonth,
  cards,
  categories,
  places,
  existingExpenses,
  existingAttachment,
}: Props): React.ReactElement | null {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: userPrefs } = useUserPrefs()
  const createCategory = useCreateCategory()

  const resolvedDefaultCardId =
    existingAttachment?.cardId ??
    userPrefs?.defaultCardId ??
    cards[0]?.id ??
    ''

  const hasPendingLines = (existingAttachment?.pendingLines?.length ?? 0) > 0
  const [step, setStep] = useState<Step>(
    existingAttachment ? (hasPendingLines ? 'reviewing' : 'processing') : 'setup',
  )
  const [processSwitch, setProcessSwitch] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState(resolvedDefaultCardId)
  const [rows, setRows] = useState<StatementImportRow[]>(existingAttachment?.pendingLines ?? [])
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentAttachmentId, setCurrentAttachmentId] = useState<string | null>(
    existingAttachment?.id ?? null,
  )
  const [sourceUrl, setSourceUrl] = useState<string | null>(existingAttachment?.url ?? null)
  // Seed for the "convert line → recurring payment" modal (null = closed).
  const [recurringSeed, setRecurringSeed] = useState<Partial<RecurringFormValues> | null>(null)

  const handleClose = useCallback(() => {
    setStep('setup')
    setRows([])
    setError(null)
    setCurrentAttachmentId(null)
    onClose()
  }, [onClose])

  // Persist the extracted lines on the attachment so they survive a close and
  // don't need to be re-processed (re-sent to the AI) next time.
  const persistPendingLines = useCallback(
    async (attachmentId: string, detectedRows: StatementImportRow[]) => {
      try {
        await reportAttachmentsService.savePendingLines(attachmentId, detectedRows)
        void qc.invalidateQueries({ queryKey: ['reportAttachments', yearMonth] })
      } catch {
        /* non-blocking: user can still review/save in this session */
      }
    },
    [qc, yearMonth],
  )

  const processFile = useCallback(
    async (file: File, attachmentId: string) => {
      setStep('processing')
      setError(null)
      try {
        const lines = await parsePdf(file)
        const detectedRows = detectDuplicates(lines, existingExpenses, selectedCardId, categories)
        setRows(detectedRows)
        setCurrentAttachmentId(attachmentId)
        await persistPendingLines(attachmentId, detectedRows)
        setStep('reviewing')
      } catch (err) {
        setError((err as Error).message ?? 'Error al procesar el PDF')
        setStep('setup')
      }
    },
    [existingExpenses, selectedCardId, categories, persistPendingLines],
  )

  const extractFromUrl = useCallback(
    async (url: string, attachmentId: string | null, hadRows: boolean) => {
      setStep('processing')
      setError(null)
      try {
        const lines = await parsePdfFromUrl(url)
        const detectedRows = detectDuplicates(lines, existingExpenses, selectedCardId, categories)
        setRows(detectedRows)
        if (attachmentId) {
          setCurrentAttachmentId(attachmentId)
          await persistPendingLines(attachmentId, detectedRows)
        }
        setStep('reviewing')
      } catch (err) {
        setError((err as Error).message ?? 'Error al procesar el PDF')
        setStep(hadRows ? 'reviewing' : 'setup')
      }
    },
    [existingExpenses, selectedCardId, categories, persistPendingLines],
  )

  const processExistingAttachment = useCallback(async () => {
    if (!existingAttachment) return
    await extractFromUrl(existingAttachment.url, existingAttachment.id, true)
  }, [existingAttachment, extractFromUrl])

  // Re-run the AI extraction on the same document (discards current edits).
  const reprocess = useCallback(async () => {
    if (!sourceUrl) return
    await extractFromUrl(sourceUrl, currentAttachmentId, true)
  }, [sourceUrl, currentAttachmentId, extractFromUrl])

  // Sync default card once userPrefs loads (only if user hasn't manually changed it)
  React.useEffect(() => {
    if (!selectedCardId && resolvedDefaultCardId) {
      setSelectedCardId(resolvedDefaultCardId)
    }
  }, [resolvedDefaultCardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // (Re)initialize whenever the modal opens.
  React.useEffect(() => {
    if (!isOpen) return
    setError(null)
    setCurrentAttachmentId(existingAttachment?.id ?? null)
    setSourceUrl(existingAttachment?.url ?? null)
    const pending = existingAttachment?.pendingLines ?? []
    if (existingAttachment && pending.length > 0) {
      // Lines already extracted & saved → jump straight to review (no re-processing).
      setRows(pending)
      setStep('reviewing')
    } else if (existingAttachment) {
      setRows([])
      setStep('processing')
      void processExistingAttachment()
    } else {
      setRows([])
      setStep('setup')
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!file.type.includes('pdf')) {
        setError('Solo se aceptan archivos PDF')
        return
      }
      setError(null)
      setStep('uploading')

      let attachment: ReportAttachment
      try {
        attachment = await reportAttachmentsService.upload(yearMonth, file, {
          cardId: selectedCardId || undefined,
        })
      } catch (err) {
        setError((err as Error).message ?? 'Error al subir el archivo')
        setStep('setup')
        return
      }

      void qc.invalidateQueries({ queryKey: ['reportAttachments', yearMonth] })
      setSourceUrl(attachment.url)

      if (!processSwitch) {
        handleClose()
        return
      }

      await processFile(file, attachment.id)
    },
    [yearMonth, selectedCardId, processSwitch, processFile, qc, handleClose],
  )

  const handleSave = useCallback(async () => {
    const toImport = rows.filter((r) => r.action === StatementImportAction.Import && !r.imported)
    if (toImport.length === 0) {
      handleClose()
      return
    }

    setStep('saving')
    try {
      const payloads = toImport.flatMap((r) => {
        const base = {
          description: r.description,
          amount: r.amount,
          currency: r.currency,
          cardId: r.cardId ?? selectedCardId,
          categoryIds: r.categoryId ? [r.categoryId] : [],
          placeId: r.placeId,
          date: r.date,
          importedFrom: 'statement' as const,
          ...(currentAttachmentId ? { statementAttachmentId: currentAttachmentId } : {}),
        }
        const n = r.installments ?? 1
        return n > 1 ? buildInstallmentPayloads(base, n, crypto.randomUUID()) : [base]
      })

      await expensesService.createBatch(payloads)

      // Flag the just-imported lines but KEEP the full extracted set stored, so the
      // document can be reopened later showing what was imported vs still pending.
      const importedIds = new Set(toImport.map((r) => r.rowId))
      const updatedRows = rows.map((r) =>
        importedIds.has(r.rowId)
          ? { ...r, imported: true, action: StatementImportAction.Skip }
          : r,
      )
      const stillPending = updatedRows.filter((r) => !r.imported)

      if (currentAttachmentId) {
        let updated = await reportAttachmentsService.savePendingLines(currentAttachmentId, updatedRows)
        // Only mark the document fully processed once nothing is left to import.
        if (stillPending.length === 0) {
          const alreadyImported = existingExpenses.filter(
            (e) => e.statementAttachmentId === currentAttachmentId,
          ).length
          updated = await reportAttachmentsService.markProcessed(currentAttachmentId, {
            importedExpenseCount: alreadyImported + toImport.length,
          })
        }
        // Update the feed cache directly with the persisted attachment so the
        // "Revisar (N)" count reflects the new imported/pending state immediately.
        qc.setQueryData<ReportAttachment[]>(['reportAttachments', yearMonth], (prev) =>
          prev ? prev.map((a) => (a.id === currentAttachmentId ? updated : a)) : prev,
        )
        void qc.invalidateQueries({ queryKey: ['reportAttachments', yearMonth] })
      }

      void qc.invalidateQueries({ queryKey: ['expenses'] })
      handleClose()
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar los gastos')
      setStep('reviewing')
    }
  }, [rows, selectedCardId, currentAttachmentId, existingExpenses, yearMonth, qc, handleClose])

  const updateRow = useCallback((rowId: string, patch: Partial<StatementImportRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }, [])

  // Seed the recurring-payment form with a line's data and open it.
  const openRecurringFromRow = useCallback(
    (row: StatementImportRow) => {
      const day = Number(row.date?.split('-')[2]) || undefined
      setRecurringSeed({
        name: row.description,
        description: row.description,
        amount: row.amount,
        currency: row.currency,
        categoryIds: row.categoryId ? [row.categoryId] : [],
        cardId: row.cardId ?? selectedCardId,
        ...(day ? { dueDayOfMonth: day } : {}),
      })
    },
    [selectedCardId],
  )

  const toggleAll = useCallback(() => {
    setRows((prev) => {
      const selectable = prev.filter((r) => !r.imported)
      const allImport =
        selectable.length > 0 && selectable.every((r) => r.action === StatementImportAction.Import)
      const next = allImport ? StatementImportAction.Skip : StatementImportAction.Import
      return prev.map((r) => (r.imported ? r : { ...r, action: next }))
    })
  }, [])

  // Remove a line entirely (e.g. subscriptions already tracked elsewhere).
  // Persist so the removal survives closing/reopening without re-processing.
  const removeRow = useCallback(
    (rowId: string) => {
      setRows((prev) => {
        const next = prev.filter((r) => r.rowId !== rowId)
        if (currentAttachmentId) void persistPendingLines(currentAttachmentId, next)
        return next
      })
    },
    [currentAttachmentId, persistPendingLines],
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
      // No existing category matches the AI suggestion → create it and assign.
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

  if (!isOpen) return null

  const selectableRows = rows.filter((r) => !r.imported)
  const importedCount = rows.length - selectableRows.length
  const importCount = selectableRows.filter((r) => r.action === StatementImportAction.Import).length
  const allSelected = selectableRows.length > 0 && importCount === selectableRows.length
  const someSelected = importCount > 0 && importCount < selectableRows.length

  // Totals per currency straight from the document processing (all extracted lines).
  const documentTotals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + (Number.isFinite(r.amount) ? r.amount : 0)
    return acc
  }, {})
  const documentCurrencies = Object.keys(documentTotals) as Currency[]

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>
            {step === 'reviewing' ? 'Revisar líneas extraídas' : 'Importar estado de cuenta'}
          </span>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {error && (
            <div className={styles.errorBox} style={{ marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Setup step ── */}
          {step === 'setup' && (
            <div className={styles.setupSection}>
              {/* Card selector */}
              <div>
                <label className={styles.fieldLabel}>Tarjeta</label>
                <select
                  className={styles.select}
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                >
                  <option value="">Sin tarjeta asignada</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>{cardLabel(c)}</option>
                  ))}
                </select>
              </div>

              {/* Process switch */}
              <div className={styles.toggleRow}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={processSwitch}
                    onChange={(e) => setProcessSwitch(e.target.checked)}
                  />
                  <span className={styles.toggleTrack} />
                </label>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Procesar y extraer líneas de gastos</div>
                  <div className={styles.toggleHint}>
                    La IA leerá el PDF y extraerá cada cargo. Puede demorar unos segundos.
                  </div>
                </div>
              </div>

              {/* Dropzone */}
              <label
                className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) void handleFileDrop(file)
                }}
              >
                <span className={styles.dropzoneIcon}>📄</span>
                <span className={styles.dropzoneText}>Arrastrá o seleccioná el PDF</span>
                <span className={styles.dropzoneHint}>Solo archivos PDF de estados de cuenta</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className={styles.dropzoneInput}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleFileDrop(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          )}

          {/* ── Uploading step ── */}
          {step === 'uploading' && (
            <div className={styles.processingCenter}>
              <div className={styles.processingIcon}>📤</div>
              <div className={styles.spinner} />
              <div className={styles.processingTitle}>Subiendo PDF…</div>
              <div className={styles.processingHint}>Guardando el archivo de forma segura</div>
            </div>
          )}

          {/* ── Processing step ── */}
          {step === 'processing' && (
            <div className={styles.processingCenter}>
              <div className={styles.processingIcon}>🔍</div>
              <div className={styles.spinner} />
              <div className={styles.processingTitle}>Procesando PDF…</div>
              <div className={styles.processingHint}>Extrayendo líneas de gastos con IA</div>
            </div>
          )}

          {/* ── Reviewing step ── */}
          {step === 'reviewing' && (
            <>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewTitleRow}>
                  <span className={styles.reviewTitle}>Revisá y editá los gastos antes de guardar</span>
                  <button
                    type="button"
                    className={styles.reprocessBtn}
                    onClick={() => void reprocess()}
                    disabled={!sourceUrl}
                    title="Volver a extraer las líneas con IA (descarta los cambios actuales)"
                  >
                    🔄 Reprocesar
                  </button>
                </div>
                <span className={styles.reviewCount}>
                  {importCount} de {selectableRows.length} a importar
                  {importedCount > 0 ? ` · ${importedCount} ya importado${importedCount !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
              <ImportReviewTable
                rows={rows}
                categories={categories}
                places={places}
                allSelected={allSelected}
                someSelected={someSelected}
                createCategoryPending={createCategory.isPending}
                onToggleAll={toggleAll}
                onUpdateRow={updateRow}
                onRemoveRow={removeRow}
                onApplySuggestion={applySuggestion}
                onOpenRecurring={openRecurringFromRow}
              />
            </>
          )}

          {/* ── Saving step ── */}
          {step === 'saving' && (
            <div className={styles.processingCenter}>
              <div className={styles.spinner} />
              <div className={styles.processingTitle}>Guardando {importCount} gastos…</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'reviewing' || step === 'saving') && (
          <div className={styles.footer}>
            {/* Invoice-style document total, fixed at the bottom */}
            <div className={styles.invoiceTotal}>
              <span className={styles.invoiceTotalLabel}>Total del documento</span>
              <div className={styles.invoiceTotalAmounts}>
                {documentCurrencies.length === 0 ? (
                  <span className={styles.invoiceTotalAmount}>—</span>
                ) : (
                  documentCurrencies.map((cur) => (
                    <span key={cur} className={styles.invoiceTotalAmount}>
                      {formatAmount(documentTotals[cur], cur)}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className={styles.footerActions}>
              <button className={styles.btnCancel} onClick={handleClose} disabled={step === 'saving'}>
                Cancelar
              </button>
              <button
                className={styles.btnSave}
                onClick={() => void handleSave()}
                disabled={step === 'saving' || importCount === 0}
              >
                {step === 'saving'
                  ? 'Guardando…'
                  : importCount === 0
                    ? 'Sin gastos seleccionados'
                    : `Guardar ${importCount} gasto${importCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {recurringSeed && (
        <RecurringFormModal
          title="🔁 Nuevo pago recurrente"
          initialValues={recurringSeed}
          onClose={() => setRecurringSeed(null)}
        />
      )}
    </div>
  )
}
