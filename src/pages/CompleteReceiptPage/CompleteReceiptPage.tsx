// src/pages/CompleteReceiptPage/CompleteReceiptPage.tsx

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { useCreateExpense } from '@/features/expenses/hooks/useExpenses'
import { expensesService } from '@/services/expensesService'
import { usePendingReceipts, useUpdatePendingReceipt, useDeletePendingReceipt } from '@/features/pendingReceipts/hooks/usePendingReceipts'
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
  const { data: receipts = [], isLoading } = usePendingReceipts()
  const { mutateAsync: updateReceipt } = useUpdatePendingReceipt()
  const { mutateAsync: deleteReceipt } = useDeletePendingReceipt()
  const { mutateAsync: createExpense } = useCreateExpense()

  const [phase, setPhase] = useState<Phase>('loading')
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { label: 'Imagen recibida', state: 'pending' },
    { label: 'Analizando con IA', state: 'pending' },
    { label: 'Extrayendo datos', state: 'pending' },
  ])
  const [extractedData, setExtractedData] = useState<PendingReceiptExtractedData | null>(null)
  const [analysisError, setAnalysisError] = useState(false)
  const hasStarted = useRef(false)

  const receipt = receipts.find((r) => r.id === id)

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
      data = await analyzeReceiptImage(receipt.imageUrl)
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

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    const payload: CreateExpensePayload = {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      cardId: values.cardId,
      categoryIds: values.categoryIds,
      placeId: values.placeId || undefined,
      date: values.date,
    }
    const expense = await createExpense(payload)
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

        <div className={styles.previewRow}>
          <img src={receipt.imageUrl} alt="Comprobante" className={styles.thumbImg} />
          <button className={styles.discardBtn} onClick={() => void handleDiscard()}>
            Descartar comprobante
          </button>
        </div>

        <ExpenseForm
          initialValues={{
            description: extractedData?.description ?? '',
            amount: extractedData?.amount ?? 0,
            currency: extractedData?.currency,
            date: extractedData?.date ?? new Date().toISOString().split('T')[0],
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
