// src/pages/NotFoundPage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage(): React.ReactElement {
  const navigate = useNavigate()
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: 32,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 64 }}>🌿</span>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800 }}>
        Página no encontrada
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)' }}>
        La URL que buscás no existe.
      </p>
      <Button onClick={() => navigate('/home')}>Ir al inicio</Button>
    </div>
  )
}
