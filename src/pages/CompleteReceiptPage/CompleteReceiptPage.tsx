// src/pages/CompleteReceiptPage/CompleteReceiptPage.tsx

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useCreateExpense } from '@/features/expenses/hooks/useExpenses'
import { expensesService } from '@/services/expensesService'
import { usePendingReceipts, useUpdatePendingReceipt, useDeletePendingReceipt } from '@/features/pendingReceipts/hooks/usePendingReceipts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { ProcessingScreen } from '@/features/pendingReceipts/components/ProcessingScreen'
import type { ProcessingStep } from '@/features/pendingReceipts/components/ProcessingScreen'
import { analyzeReceiptImage } from '@/services/receiptAnalysisService'
import { ReceiptStatus } from '@/types/enums'
import type { ExpenseFormValues } from '@/features/expenses/schemas/expenseSchema'
import type { CreateExpensePayload, PendingReceiptExtractedData } from '@/types/models'
import styles from './CompleteReceiptPage.module.css'

type Phase = 'loading' | 'processing' | 'form' | 'error'

export default function CompleteReceiptPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: receipts = [], isLoading: loadingReceipts } = usePendingReceipts()
  const { data: categories = [], isLoading: loadingCategories } = useCategories()
  const { data: places = [], isLoading: loadingPlaces } = usePlaces()
  const { mutateAsync: updateReceipt } = useUpdatePendingReceipt()
  const { mutateAsync: deleteReceipt } = useDeletePendingReceipt()
  const { mutateAsync: createExpense } = useCreateExpense()

  const isLoading = loadingReceipts || loadingCategories || loadingPlaces

  const [phase, setPhase] = useState<Phase>('loading')
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { label: 'Imagen recibida', state: 'pending' },
    { label: 'Analizando con IA', state: 'pending' },
    { label: 'Extrayendo datos', state: 'pending' },
  ])
  const [extractedData, setExtractedData] = useState<PendingReceiptExtractedData | null>(null)
  const [lines, setLines] = useState<{ name: string; amount: number }[]>([])
  const [analysisError, setAnalysisError] = useState(false)
  const hasStarted = useRef(false)

  const receipt = receipts.find((r) => r.id === id)

  // Sincroniza los ítems editables con lo que extrajo la IA.
  useEffect(() => {
    setLines(extractedData?.lines ?? [])
  }, [extractedData])

  function updateLine(index: number, field: 'name' | 'amount', value: string): void {
    setLines((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, [field]: field === 'amount' ? Number(value) || 0 : value } : l,
      ),
    )
  }

  function removeLine(index: number): void {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function addLine(): void {
    setLines((prev) => [...prev, { name: '', amount: 0 }])
  }

  function setStep(index: number, state: ProcessingStep['state']): void {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, state } : s))
    )
  }

  useEffect(() => {
    if (isLoading || !receipt || hasStarted.current) return
    // If already has extracted data, go straight to form
    if (receipt.extractedData) {
      setExtractedData(receipt.extractedData)
      setPhase('form')
      return
    }
    hasStarted.current = true
    void runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, receipt])

  async function runAnalysis(): Promise<void> {
    if (!receipt) return
    setPhase('processing')

    // Step 1: image received
    setStep(0, 'active')
    await delay(400)
    setStep(0, 'done')

    // Step 2: analyzing
    setStep(1, 'active')
    let data: PendingReceiptExtractedData
    try {
      data = await analyzeReceiptImage(receipt.imageUrl, { categories, places })
    } catch {
      setStep(1, 'done')
      setStep(2, 'active')
      await delay(300)
      setStep(2, 'done')
      setAnalysisError(true)
      setExtractedData({})
      await updateReceipt({ id: receipt.id, payload: { extractedData: { confidence: 'failed' } } })
      setPhase('form')
      return
    }
    setStep(1, 'done')

    // Step 3: extracting
    setStep(2, 'active')
    await delay(500)
    setStep(2, 'done')

    setExtractedData(data)
    await updateReceipt({ id: receipt.id, payload: { extractedData: data } })
    await delay(400)
    setPhase('form')
  }

  async function handleRetry(): Promise<void> {
    if (!receipt) return
    setAnalysisError(false)
    setExtractedData(null)
    setSteps([
      { label: 'Imagen recibida', state: 'pending' },
      { label: 'Analizando con IA', state: 'pending' },
      { label: 'Extrayendo datos', state: 'pending' },
    ])
    await runAnalysis()
  }

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    if (!receipt) return
    const validLines = lines
      .map((l) => ({ name: l.name.trim(), amount: l.amount }))
      .filter((l) => l.name.length > 0 && l.amount > 0)
    const payload: CreateExpensePayload = {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      cardId: values.cardId,
      categoryIds: values.categoryIds,
      placeId: values.placeId || undefined,
      date: values.date,
      // El comprobante pendiente ya está en Storage: lo usamos como recibo del gasto.
      receiptUrl: receipt.imageUrl,
      ...(validLines.length > 0 ? { ticketLines: validLines } : {}),
    }
    const expense = await createExpense(payload)
    // Si el usuario adjuntó un archivo nuevo, ese reemplaza al comprobante original.
    if (values.receiptFile) {
      await expensesService.uploadReceipt(expense.id, values.receiptFile)
    }
    if (id) {
      await updateReceipt({
        id,
        payload: { status: ReceiptStatus.Done, createdExpenseId: expense.id },
      })
    }
    navigate('/expenses')
  }

  async function handleDiscard(): Promise<void> {
    if (!id) return
    await deleteReceipt(id)
    navigate('/expenses')
  }

  if (isLoading || phase === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.loadingMsg}>Cargando comprobante…</div>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.loadingMsg}>Comprobante no encontrado.</div>
        </div>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <ProcessingScreen imageUrl={receipt.imageUrl} steps={steps} />
        </div>
      </div>
    )
  }

  const confidence = extractedData?.confidence

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Completar gasto</h1>
        </div>

        {confidence === 'high' && (
          <div className={[styles.chip, styles.chipSuccess].join(' ')}>
            ✓ Datos extraídos · revisá y confirmá
          </div>
        )}
        {confidence === 'low' && (
          <div className={[styles.chip, styles.chipWarn].join(' ')}>
            ⚠ Algunos datos incompletos · completá el formulario
          </div>
        )}
        {(confidence === 'failed' || analysisError) && (
          <div className={[styles.chip, styles.chipFailed].join(' ')}>
            No se pudo leer el comprobante · ingresá los datos a mano
          </div>
        )}

        {(extractedData?.suggestedPlaceName || (extractedData?.suggestedCategoryNames?.length ?? 0) > 0) && (
          <div className={styles.suggestionsRow}>
            {extractedData?.suggestedPlaceName && (
              <span className={styles.suggestionChip}>
                📍 Local: <strong>{extractedData.suggestedPlaceName}</strong> (nuevo)
              </span>
            )}
            {extractedData?.suggestedCategoryNames?.map((name) => (
              <span key={name} className={styles.suggestionChip}>
                🏷 Categoría sugerida: <strong>{name}</strong>
              </span>
            ))}
          </div>
        )}

        <div className={styles.previewRow}>
          <img src={receipt.imageUrl} alt="Comprobante" className={styles.thumbImg} />
          <button className={styles.retryBtn} onClick={() => void handleRetry()}>
            🔄 Reanalizar con IA
          </button>
          <button className={styles.discardBtn} onClick={() => void handleDiscard()}>
            Descartar comprobante
          </button>
        </div>

        <div className={styles.linesSection}>
          <div className={styles.linesHeader}>
            <span className={styles.linesTitle}>🧾 Ítems del ticket</span>
            <button type="button" className={styles.addLineBtn} onClick={addLine}>
              + Agregar ítem
            </button>
          </div>
          {lines.length === 0 ? (
            <p className={styles.linesEmpty}>
              No se detectaron ítems. Podés agregarlos a mano o dejarlo vacío.
            </p>
          ) : (
            <ul className={styles.linesList}>
              {lines.map((line, i) => (
                <li key={i} className={styles.lineRow}>
                  <input
                    className={styles.lineName}
                    value={line.name}
                    placeholder="Nombre del ítem"
                    onChange={(e) => updateLine(i, 'name', e.target.value)}
                  />
                  <input
                    className={styles.lineAmount}
                    type="number"
                    inputMode="decimal"
                    value={line.amount || ''}
                    placeholder="0"
                    onChange={(e) => updateLine(i, 'amount', e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.lineRemove}
                    aria-label="Quitar ítem"
                    onClick={() => removeLine(i)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ExpenseForm
          initialValues={{
            description: extractedData?.description ?? '',
            amount: extractedData?.amount ?? 0,
            currency: extractedData?.currency,
            date: extractedData?.date ?? new Date().toISOString().split('T')[0],
            ...(extractedData?.categoryIds?.length ? { categoryIds: extractedData.categoryIds } : {}),
            ...(extractedData?.placeId ? { placeId: extractedData.placeId } : {}),
          }}
          onSubmit={handleSubmit}
          submitLabel="Guardar gasto"
          variant="desktop"
          onCancel={() => navigate('/expenses')}
        />
      </div>
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
