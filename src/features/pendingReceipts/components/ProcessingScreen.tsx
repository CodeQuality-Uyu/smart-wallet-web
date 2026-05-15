// src/features/pendingReceipts/components/ProcessingScreen.tsx

import React from 'react'
import styles from './ProcessingScreen.module.css'

export interface ProcessingStep {
  label: string
  state: 'done' | 'active' | 'pending'
}

interface ProcessingScreenProps {
  imageUrl: string
  steps: ProcessingStep[]
}

export function ProcessingScreen({ imageUrl, steps }: ProcessingScreenProps): React.ReactElement {
  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.preview}>
          <img src={imageUrl} alt="Comprobante" className={styles.img} />
          <div className={styles.shimmer} />
        </div>

        <div className={styles.text}>
          <div className={styles.eyebrow}>Procesando</div>
          <h2 className={styles.title}>Analizando el comprobante.</h2>
          <p className={styles.subtitle}>Tarda unos segundos.</p>
        </div>

        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={i} className={[styles.step, styles[step.state]].join(' ')}>
              <span className={styles.stepDot}>
                {step.state === 'done' && <span className={styles.checkmark}>✓</span>}
              </span>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
