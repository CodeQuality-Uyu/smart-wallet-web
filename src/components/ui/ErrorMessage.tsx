// src/components/ui/ErrorMessage.tsx

import React from 'react'
import { Button } from './Button'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({
  message = 'Ocurrió un error inesperado.',
  onRetry,
}: ErrorMessageProps): React.ReactElement {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: '40px 20px', textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 40 }} aria-hidden>⚠️</span>
      <p style={{ fontSize: 14, color: 'var(--muted)' }}>{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
