// src/features/pendingReceipts/components/ReceiptUploader.tsx

import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePendingReceipt } from '../hooks/usePendingReceipts'
import styles from './ReceiptUploader.module.css'

export function ReceiptUploader(): React.ReactElement {
  const navigate = useNavigate()
  const { mutateAsync: create, isPending } = useCreatePendingReceipt()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function handleSubmit(): Promise<void> {
    if (!selectedFile) return
    try {
      await create(selectedFile)
      navigate('/expenses')
    } catch {
      setError('No se pudo guardar el comprobante. Intentá de nuevo.')
    }
  }

  function handleRetake(): void {
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      {!preview ? (
        <div className={styles.pickArea}>
          <div className={styles.iconWrap}>📷</div>
          <p className={styles.pickTitle}>Guardá el comprobante</p>
          <p className={styles.pickSubtitle}>
            Sacá una foto o subí una imagen del ticket.
            <br />
            Los datos se extraen después.
          </p>
          <div className={styles.pickBtns}>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment')
                  fileInputRef.current.click()
                }
              }}
            >
              📷 Sacar foto
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture')
                  fileInputRef.current.click()
                }
              }}
            >
              🖼 Subir imagen
            </button>
          </div>
          <p className={styles.hint}>Funciona mejor con buena iluminación y texto visible.</p>
        </div>
      ) : (
        <div className={styles.previewArea}>
          <div className={styles.imgWrap}>
            <img src={preview} alt="Vista previa del comprobante" className={styles.previewImg} />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.previewBtns}>
            <button className={styles.btnSecondary} onClick={handleRetake} disabled={isPending}>
              Volver a sacar
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => void handleSubmit()}
              disabled={isPending}
            >
              {isPending ? 'Guardando…' : 'Guardar comprobante'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
