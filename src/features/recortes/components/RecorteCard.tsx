// src/features/recortes/components/RecorteCard.tsx

import React, { useState } from 'react'
import { KebabMenu } from '@/components/shared/KebabMenu'
import { RecorteResultView } from './RecorteResultView'
import { RecorteBuilderModal } from './RecorteBuilderModal'
import { RecorteDataPanel } from './RecorteDataPanel'
import { useRecomputeRecorte, useRecorteResults, useDeleteRecorte } from '../hooks/useRecortes'
import type { Recorte } from '@/types/models'
import styles from './RecorteCard.module.css'

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
}

interface RecorteCardProps {
  recorte: Recorte
}

export function RecorteCard({ recorte }: RecorteCardProps): React.ReactElement {
  const [showHistory, setShowHistory] = useState(false)
  const [showData, setShowData] = useState(false)
  const [editing, setEditing] = useState(false)
  const recompute = useRecomputeRecorte()
  const del = useDeleteRecorte()
  const { data: history } = useRecorteResults(showHistory ? recorte.id : '')

  const menuItems = [
    {
      label: 'Recalcular',
      icon: '🔄',
      onClick: () => recompute.mutate(recorte),
      disabled: recompute.isPending,
    },
    {
      label: 'Editar',
      icon: '✏️',
      onClick: () => setEditing(true),
    },
    {
      label: showData ? 'Ocultar datos' : 'Ver datos analizados',
      icon: '🔍',
      onClick: () => setShowData((v) => !v),
    },
    {
      label: showHistory ? 'Ocultar historial' : 'Ver historial',
      icon: '🕘',
      onClick: () => setShowHistory((v) => !v),
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      danger: true,
      onClick: () => {
        if (window.confirm(`¿Eliminar el recorte "${recorte.name}"?`)) del.mutate(recorte.id)
      },
    },
  ]

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon} style={{ background: recorte.color }} aria-hidden>
          {recorte.icon}
        </span>
        <div className={styles.headText}>
          <p className={styles.name}>{recorte.name}</p>
          <p className={styles.description}>{recorte.description}</p>
        </div>
        <KebabMenu items={menuItems} loading={recompute.isPending} />
      </div>

      <div className={styles.result}>
        <RecorteResultView format={recorte.outputFormat} result={recorte.lastResult} />
      </div>

      <div className={styles.footer}>
        <span className={styles.scope}>{recorte.lastResult?.periodLabel ?? recorte.period}</span>
        {recorte.lastResult && (
          <span className={styles.when}>Actualizado {formatWhen(recorte.lastResult.generatedAt)}</span>
        )}
      </div>

      {recompute.isError && (
        <p className={styles.error}>
          No se pudo recalcular: {recompute.error instanceof Error ? recompute.error.message : 'error desconocido'}
        </p>
      )}

      {showData && <RecorteDataPanel recorte={recorte} />}

      {showHistory && (
        <div className={styles.history}>
          {(history ?? []).length === 0 ? (
            <p className={styles.pending}>Sin resultados anteriores.</p>
          ) : (
            <ul className={styles.historyList}>
              {(history ?? []).map((r) => (
                <li key={r.id} className={styles.historyItem}>
                  <span className={styles.historyWhen}>{formatWhen(r.generatedAt)}</span>
                  <div className={styles.historyBody}>
                    <RecorteResultView format={recorte.outputFormat} result={r} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <RecorteBuilderModal
          recorte={recorte}
          existingNames={[]}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
