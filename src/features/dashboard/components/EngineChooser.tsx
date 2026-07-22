// src/features/dashboard/components/EngineChooser.tsx
//
// Primer paso al crear un visualizador: elegir el motor (guiado o query).

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { WidgetEngine } from '@/types/enums'
import styles from './EngineChooser.module.css'

interface EngineChooserProps {
  onClose: () => void
  onPick: (engine: WidgetEngine) => void
}

export function EngineChooser({ onClose, onPick }: EngineChooserProps): React.ReactElement {
  return (
    <Modal title="Nuevo visualizador" onClose={onClose} width={540}>
      <div className={styles.body}>
        <p className={styles.intro}>Elegí cómo querés construirlo:</p>

        <button type="button" className={styles.card} onClick={() => onPick(WidgetEngine.Guided)}>
          <span className={styles.icon}>🧭</span>
          <span className={styles.text}>
            <span className={styles.title}>Guiado</span>
            <span className={styles.desc}>
              Elegí una métrica de una lista (total, categoría, presupuesto, recurrente…) con comparaciones.
              Simple y rápido.
            </span>
          </span>
          <span className={styles.arrow}>→</span>
        </button>

        <button type="button" className={styles.card} onClick={() => onPick(WidgetEngine.Query)}>
          <span className={styles.icon}>🛠️</span>
          <span className={styles.text}>
            <span className={styles.title}>Query flexible</span>
            <span className={styles.desc}>
              Armá tu propia consulta sobre los gastos: filtros, agrupación y agregación, mostrada como número,
              tabla o gráfica. Máxima libertad.
            </span>
          </span>
          <span className={styles.arrow}>→</span>
        </button>
      </div>
    </Modal>
  )
}
