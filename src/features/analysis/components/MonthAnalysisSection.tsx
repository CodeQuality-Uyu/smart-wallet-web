// src/features/analysis/components/MonthAnalysisSection.tsx

import React from 'react'
import { useMonthAnalysis, useGenerateMonthAnalysis } from '@/hooks/useMonthAnalysis'
import type { MetricsSummary, MonthAnalysisAxis } from '@/types/models'
import styles from './MonthAnalysisSection.module.css'

interface Props {
  yearMonth: string
  metrics: MetricsSummary | undefined
}

interface AxisProps {
  icon: string
  title: string
  axis: MonthAnalysisAxis
}

function Axis({ icon, title, axis }: AxisProps): React.ReactElement {
  return (
    <div className={styles.axis}>
      <div className={styles.axisHeader}>
        <span className={styles.axisIcon}>{icon}</span>
        <span className={styles.axisTitle}>{title}</span>
      </div>
      <div className={styles.axisBody}>
        {axis.insights.length > 0 ? (
          <div className={styles.insightList}>
            {axis.insights.map((item, i) => (
              <div key={i} className={styles.insightItem}>
                <span className={styles.insightCategory}>{item.category}</span>
                <span className={styles.insightText}>{item.insight}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyNote}>{axis.note}</p>
        )}
      </div>
    </div>
  )
}

export function MonthAnalysisSection({ yearMonth, metrics }: Props): React.ReactElement {
  const { data: analysis, isLoading: isLoadingExisting } = useMonthAnalysis(yearMonth)
  const generate = useGenerateMonthAnalysis(yearMonth)

  const handleGenerate = () => {
    if (!metrics) return
    generate.mutate(metrics)
  }

  const isGenerating = generate.isPending
  const error = generate.error as Error | null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>🤖</span>
          <span className={styles.title}>Análisis del mes</span>
        </div>
        {analysis && !isGenerating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={styles.generatedAt}>
              Generado el {new Date(analysis.generatedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })}
            </span>
            <button
              className={styles.regenerateBtn}
              onClick={handleGenerate}
              disabled={!metrics || isGenerating}
            >
              Regenerar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBox}>⚠️ {error.message}</div>
      )}

      {/* Loading existing analysis */}
      {isLoadingExisting && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Cargando análisis…</span>
        </div>
      )}

      {/* Generating new analysis */}
      {isGenerating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Analizando tus gastos del mes…</span>
        </div>
      )}

      {/* No analysis yet */}
      {!isLoadingExisting && !isGenerating && !analysis && (
        <div className={styles.idle}>
          <span className={styles.idleIcon}>💡</span>
          <p className={styles.idleTitle}>Todavía no hay análisis para este mes</p>
          <p className={styles.idleHint}>
            La IA va a revisar tus gastos, identificar qué se puede reducir y explicarte en qué se fue la plata.
          </p>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!metrics}
          >
            Generar análisis
          </button>
        </div>
      )}

      {/* Analysis result */}
      {!isGenerating && analysis && (
        <>
          <p className={styles.summary}>{analysis.summary}</p>
          <div className={styles.axes}>
            <Axis
              icon="🚫"
              title="Gastos innecesarios"
              axis={analysis.unnecessary}
            />
            <Axis
              icon="✂️"
              title="Se puede reducir o cortar"
              axis={analysis.reducible}
            />
            <div className={styles.axis}>
              <div className={styles.axisHeader}>
                <span className={styles.axisIcon}>🔁</span>
                <span className={styles.axisTitle}>¿Se repite o fue algo puntual?</span>
              </div>
              <div className={styles.axisBody}>
                <p className={styles.preventableText}>{analysis.preventable}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
