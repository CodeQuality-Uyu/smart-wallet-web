// src/components/ui/Modal.tsx

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
  titleAction?: React.ReactNode
  /** Si es false, no se puede cerrar (sin ✕, sin overlay/Escape). Default true. */
  dismissible?: boolean
}

export function Modal({
  title,
  onClose,
  children,
  width = 520,
  titleAction,
  dismissible = true,
}: ModalProps): React.ReactElement {
  useEffect(() => {
    if (!dismissible) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return (): void => document.removeEventListener('keydown', onKey)
  }, [onClose, dismissible])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return (): void => { document.body.style.overflow = prev }
  }, [])

  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      onClick={dismissible ? onClose : undefined}
      role="dialog"
      aria-modal
    >
      <div
        className={styles.panel}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{title}</h2>
            {titleAction && <span className={styles.titleAction}>{titleAction}</span>}
          </div>
          {dismissible && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
