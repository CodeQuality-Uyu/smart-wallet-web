// src/pages/RecortesPage/RecortesPage.tsx

import React, { useState } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { RecorteCard } from '@/features/recortes/components/RecorteCard'
import { RecorteBuilderModal } from '@/features/recortes/components/RecorteBuilderModal'
import { useRecortesList } from '@/features/recortes/hooks/useRecortes'
import styles from './RecortesPage.module.css'

export default function RecortesPage(): React.ReactElement {
  const { data: recortes, isLoading, error, refetch } = useRecortesList()
  const [showBuilder, setShowBuilder] = useState(false)

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !recortes) return <ErrorMessage onRetry={() => void refetch()} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.title}>✂️ Recortes</p>
          <p className={styles.subtitle}>Indicadores de ahorro que definís vos y se recalculan sobre tus gastos</p>
        </div>
        <Button size="sm" onClick={() => setShowBuilder(true)}>+ Nuevo</Button>
      </div>

      {recortes.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Todavía no tenés recortes</p>
          <p className={styles.emptyText}>
            Creá tu primer indicador: escribí qué querés vigilar y lo calculamos sobre tus gastos.
          </p>
          <Button onClick={() => setShowBuilder(true)}>Crear mi primer recorte</Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {recortes.map((r) => (
            <RecorteCard key={r.id} recorte={r} />
          ))}
        </div>
      )}

      {showBuilder && (
        <RecorteBuilderModal
          existingNames={recortes.map((r) => r.name)}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  )
}
