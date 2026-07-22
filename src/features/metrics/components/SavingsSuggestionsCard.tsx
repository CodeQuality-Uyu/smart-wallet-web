// src/features/metrics/components/SavingsSuggestionsCard.tsx

import React, { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { PeriodControl } from '@/components/ui/PeriodControl'
import type { PeriodOption } from '@/components/ui/PeriodControl.constants'
import { computeSavingsPlan } from '@/features/metrics/savingsSuggestions'
import { PeriodFilter } from '@/types/enums'
import type { Currency } from '@/types/enums'
import styles from './SavingsSuggestionsCard.module.css'

interface SavingsSuggestionsCardProps {
  currencyFilter: Currency | ''
  /**
   * Controlled mode: the parent supplies the time scope (e.g. MetricsPage passes
   * its own period filter). The card renders no time filter of its own.
   */
  period?: PeriodFilter
  /**
   * Self-contained mode: the card includes its own time filter with these options
   * and default. Ignored when `period` is provided.
   */
  selfFilter?: { options: PeriodOption[]; defaultPeriod: PeriodFilter }
  /** Optional line under the title (used in controlled mode). */
  scopeLabel?: string
}

export function SavingsSuggestionsCard({
  currencyFilter,
  period,
  selfFilter,
  scopeLabel,
}: SavingsSuggestionsCardProps): React.ReactElement {
  const [innerPeriod, setInnerPeriod] = useState<PeriodFilter>(
    selfFilter?.defaultPeriod ?? PeriodFilter.Month,
  )
  const [showDiag, setShowDiag] = useState(false)
  const activePeriod = period ?? innerPeriod
  // React Query dedupes by key, so this shares MetricsPage's fetch when the
  // period matches — no extra network request in controlled mode.
  const { data: metrics, isLoading } = useMetrics(activePeriod)

  const { suggestions, diagnostics } = metrics
    ? computeSavingsPlan(metrics, currencyFilter)
    : { suggestions: [], diagnostics: [] }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.cardTitle}>✂️ Dónde podrías recortar</h3>
        {selfFilter ? (
          <PeriodControl
            options={selfFilter.options}
            value={innerPeriod}
            onChange={setInnerPeriod}
          />
        ) : (
          scopeLabel && <span className={styles.scope}>{scopeLabel}</span>
        )}
      </div>

      {isLoading ? (
        <p className={styles.loading}>Calculando sugerencias…</p>
      ) : suggestions.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>✅ Vas bien</p>
          <p className={styles.emptyText}>
            No detectamos oportunidades claras de recorte en este período. ¡Buen manejo de tus gastos!
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {suggestions.map((s) => (
            <li key={s.id} className={[styles.item, styles[s.severity]].join(' ')}>
              <span className={styles.icon} aria-hidden>{s.icon}</span>
              <div className={styles.body}>
                <p className={styles.title}>{s.title}</p>
                <p className={styles.detail}>{s.detail}</p>
                {s.estimateText && <span className={styles.estimate}>{s.estimateText}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Diagnóstico: todas las heurísticas evaluadas, con su estado y motivo */}
      {!isLoading && diagnostics.length > 0 && (
        <div className={styles.diag}>
          <button
            type="button"
            className={styles.diagToggle}
            onClick={() => setShowDiag((v) => !v)}
            aria-expanded={showDiag}
          >
            {showDiag ? '▾' : '▸'} Ver diagnóstico ({diagnostics.length})
          </button>
          {showDiag && (
            <ul className={styles.diagList}>
              {diagnostics.map((d) => (
                <li
                  key={d.key}
                  className={[styles.diagItem, d.fired ? styles.diagFired : styles.diagOff].join(' ')}
                >
                  <span className={styles.diagMark} aria-hidden>{d.fired ? '✓' : '✕'}</span>
                  <div className={styles.diagBody}>
                    <span className={styles.diagName}>
                      {d.heuristic} <span className={styles.diagCur}>· {d.currency}</span>
                    </span>
                    <span className={styles.diagReason}>{d.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
