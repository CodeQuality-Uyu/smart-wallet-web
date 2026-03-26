// src/components/ui/LoadingSpinner.tsx

import React from 'react'
import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  fullPage?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({
  fullPage = false,
  size = 'md',
}: LoadingSpinnerProps): React.ReactElement {
  const spinner = <div className={[styles.spinner, styles[size]].join(' ')} role="status" aria-label="Cargando" />

  if (fullPage) {
    return (
      <div className={styles.fullPage}>
        {spinner}
      </div>
    )
  }

  return spinner
}
