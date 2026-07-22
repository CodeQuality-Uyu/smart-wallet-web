// src/features/dashboard/components/HelpLabel.tsx
//
// Label de campo con botón de ayuda (ⓘ) que despliega una pista inline.
// Compartido por los editores guiado y query. El help puede ser un texto simple
// o una lista de ítems (término + descripción).

import React from 'react'
import styles from './HelpLabel.module.css'

export interface HelpItem {
  term: string
  desc: string
}
export type HelpContent = string | HelpItem[]

function helpToTitle(help: HelpContent): string {
  return typeof help === 'string' ? help : help.map((h) => `${h.term}: ${h.desc}`).join(' · ')
}

export function HelpLabel({ label, help }: { label: string; help: HelpContent }): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={styles.helpLabel}>
      <div className={styles.helpLabelRow}>
        <span className={styles.fieldLabelText}>{label}</span>
        <button
          type="button"
          className={styles.helpBtn}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Ayuda sobre ${label}`}
          title={helpToTitle(help)}
        >
          ⓘ
        </button>
      </div>
      {open &&
        (typeof help === 'string' ? (
          <p className={styles.fieldHint}>{help}</p>
        ) : (
          <div className={styles.fieldHint}>
            {help.map((h) => (
              <span key={h.term} className={styles.fieldHintItem}>
                <strong>{h.term}:</strong> {h.desc}
              </span>
            ))}
          </div>
        ))}
    </div>
  )
}
