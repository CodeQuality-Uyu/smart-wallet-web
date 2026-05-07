// src/features/statements/components/StatementImportModal.tsx

import React, { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { parsePdf, parsePdfFromUrl, detectDuplicates } from '@/services/statementService'
import { expensesService } from '@/services/expensesService'
import { reportAttachmentsService } from '@/services/reportAttachmentsService'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { StatementImportAction } from '@/types/enums'
import type { Card, Category, Place, Expense, ReportAttachment, StatementImportRow } from '@/types/models'
import { cardLabel } from '@/features/cards/cardUtils'
import { Currency } from '@/types/enums'
import styles from './StatementImportModal.module.css'

type Step = 'setup' | 'processing' | 'reviewing' | 'saving'

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

  const resolvedDefaultCardId =
    existingAttachment?.cardId ??
    userPrefs?.defaultCardId ??
    cards[0]?.id ??
    ''

  const [step, setStep] = useState<Step>(existingAttachment ? 'processing' : 'setup')
  const [processSwitch, setProcessSwitch] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState(resolvedDefaultCardId)
  const [rows, setRows] = useState<StatementImportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentAttachmentId, setCurrentAttachmentId] = useState<string | null>(
    existingAttachment?.id ?? null,
  )

  const handleClose = useCallback(() => {
    setStep(existingAttachment ? 'processing' : 'setup')
    setRows([])
    setError(null)
    setCurrentAttachmentId(existingAttachment?.id ?? null)
    onClose()
  }, [onClose, existingAttachment])

  const processFile = useCallback(
    async (file: File, attachmentId: string) => {
      setStep('processing')
      setError(null)
      try {
        const lines = await parsePdf(file)
        const detectedRows = detectDuplicates(lines, existingExpenses, selectedCardId, categories)
        setRows(detectedRows)
        setCurrentAttachmentId(attachmentId)
        setStep('reviewing')
      } catch (err) {
        setError((err as Error).message ?? 'Error al procesar el PDF')
        setStep('setup')
      }
    },
    [existingExpenses, selectedCardId, categories],
  )

  const processExistingAttachment = useCallback(async () => {
    if (!existingAttachment) return
    setStep('processing')
    setError(null)
    try {
      const lines = await parsePdfFromUrl(existingAttachment.url)
      const detectedRows = detectDuplicates(lines, existingExpenses, selectedCardId, categories)
      setRows(detectedRows)
      setCurrentAttachmentId(existingAttachment.id)
      setStep('reviewing')
    } catch (err) {
      setError((err as Error).message ?? 'Error al procesar el PDF')
      setStep(existingAttachment ? 'reviewing' : 'setup')
    }
  }, [existingAttachment, existingExpenses, selectedCardId, categories])

  // Sync default card once userPrefs loads (only if user hasn't manually changed it)
  React.useEffect(() => {
    if (!selectedCardId && resolvedDefaultCardId) {
      setSelectedCardId(resolvedDefaultCardId)
    }
  }, [resolvedDefaultCardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start processing existing attachment on open
  React.useEffect(() => {
    if (isOpen && existingAttachment && step === 'processing' && rows.length === 0 && !error) {
      void processExistingAttachment()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!file.type.includes('pdf')) {
        setError('Solo se aceptan archivos PDF')
        return
      }
      setError(null)

      let attachment: ReportAttachment
      try {
        attachment = await reportAttachmentsService.upload(yearMonth, file, {
          cardId: selectedCardId || undefined,
        })
      } catch (err) {
        setError((err as Error).message ?? 'Error al subir el archivo')
        return
      }

      void qc.invalidateQueries({ queryKey: ['reportAttachments', yearMonth] })

      if (!processSwitch) {
        handleClose()
        return
      }

      await processFile(file, attachment.id)
    },
    [yearMonth, selectedCardId, processSwitch, processFile, qc, handleClose],
  )

  const handleSave = useCallback(async () => {
    const toImport = rows.filter((r) => r.action === StatementImportAction.Import)
    if (toImport.length === 0) {
      handleClose()
      return
    }

    setStep('saving')
    try {
      const payloads = toImport.map((r) => ({
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        cardId: r.cardId ?? selectedCardId,
        categoryIds: r.categoryId ? [r.categoryId] : [],
        placeId: r.placeId,
        date: r.date,
        importedFrom: 'statement' as const,
        ...(currentAttachmentId ? { statementAttachmentId: currentAttachmentId } : {}),
      }))

      await expensesService.createBatch(payloads)

      if (currentAttachmentId) {
        await reportAttachmentsService.markProcessed(currentAttachmentId, {
          importedExpenseCount: toImport.length,
        })
        void qc.invalidateQueries({ queryKey: ['reportAttachments', yearMonth] })
      }

      void qc.invalidateQueries({ queryKey: ['expenses'] })
      handleClose()
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar los gastos')
      setStep('reviewing')
    }
  }, [rows, selectedCardId, currentAttachmentId, yearMonth, qc, handleClose])

  const updateRow = useCallback((rowId: string, patch: Partial<StatementImportRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }, [])

  if (!isOpen) return null

  const importCount = rows.filter((r) => r.action === StatementImportAction.Import).length

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
                <span className={styles.reviewTitle}>Revisá y editá los gastos antes de guardar</span>
                <span className={styles.reviewCount}>{importCount} de {rows.length} a importar</span>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>✓</th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Moneda</th>
                      <th>Categoría</th>
                      <th>Local</th>
                      <th>Tarjeta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSkipped = row.action === StatementImportAction.Skip
                      return (
                        <tr key={row.rowId} className={isSkipped ? styles.rowSkipped : undefined}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!isSkipped}
                              onChange={(e) =>
                                updateRow(row.rowId, {
                                  action: e.target.checked
                                    ? StatementImportAction.Import
                                    : StatementImportAction.Skip,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className={styles.tableInput}
                              value={row.date}
                              style={{ minWidth: 120 }}
                              onChange={(e) => updateRow(row.rowId, { date: e.target.value })}
                            />
                          </td>
                          <td>
                            <div className={styles.descCell} title={row.description}>
                              {row.description}
                            </div>
                            {row.matchedExpenseId && (
                              <div className={styles.dupBadge}>
                                ⚠️ Posible duplicado
                              </div>
                            )}
                          </td>
                          <td className={styles.amountCell}>
                            <input
                              type="number"
                              className={styles.tableInput}
                              value={row.amount}
                              min={0}
                              style={{ width: 80 }}
                              onChange={(e) =>
                                updateRow(row.rowId, { amount: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </td>
                          <td>
                            <select
                              className={styles.tableSelect}
                              value={row.currency}
                              style={{ minWidth: 70 }}
                              onChange={(e) =>
                                updateRow(row.rowId, { currency: e.target.value as Currency })
                              }
                            >
                              <option value={Currency.UYU}>UYU</option>
                              <option value={Currency.USD}>USD</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className={styles.tableSelect}
                              value={row.categoryId ?? ''}
                              onChange={(e) =>
                                updateRow(row.rowId, { categoryId: e.target.value || undefined })
                              }
                            >
                              <option value="">Sin categoría</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                              ))}
                            </select>
                            {row.suggestedCategoryName && !row.categoryId && (
                              <button
                                className={styles.catSuggestion}
                                onClick={() => {
                                  const match = categories.find((c) =>
                                    c.name.toLowerCase().includes(row.suggestedCategoryName!.toLowerCase()) ||
                                    row.suggestedCategoryName!.toLowerCase().includes(c.name.toLowerCase()),
                                  )
                                  if (match) updateRow(row.rowId, { categoryId: match.id })
                                }}
                                title={`Sugerencia IA: ${row.suggestedCategoryName}`}
                              >
                                ✨ {row.suggestedCategoryName}
                              </button>
                            )}
                          </td>
                          <td>
                            <select
                              className={styles.tableSelect}
                              value={row.placeId ?? ''}
                              onChange={(e) =>
                                updateRow(row.rowId, { placeId: e.target.value || undefined })
                              }
                            >
                              <option value="">Sin local</option>
                              {places.map((p) => (
                                <option key={p.id} value={p.id}>{p.icon ?? '📍'} {p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className={styles.tableSelect}
                              value={row.cardId ?? ''}
                              onChange={(e) =>
                                updateRow(row.rowId, { cardId: e.target.value || undefined })
                              }
                            >
                              <option value="">Sin tarjeta</option>
                              {cards.map((c) => (
                                <option key={c.id} value={c.id}>{cardLabel(c)}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
        )}
      </div>
    </div>
  )
}
